// Comprehensive Referral Tracking and Commission System

import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { notificationService } from './notificationService'
import { paymentService } from './paymentService'

const prisma = new PrismaClient()

interface ReferralCodeRequest {
  userId: string
  customCode?: string
}

interface CommissionCalculation {
  referralId: string
  saleAmount: number
  commissionRate: number
  commissionAmount: number
  tierLevel: string
}

interface PayoutRequest {
  referrerId: string
  commissionIds: string[]
  paymentMethod: 'BANK_TRANSFER' | 'PAYPAL' | 'CHECK'
  paymentDetails: Record<string, any>
}

export class ReferralService {
  private readonly defaultCommissionRates = {
    'TIER_1': { percentage: 10, flatAmount: 0, minimumSale: 50 },
    'TIER_2': { percentage: 15, flatAmount: 5, minimumSale: 100 },
    'TIER_3': { percentage: 20, flatAmount: 10, minimumSale: 200 }
  }

  async initializeCommissionRules(): Promise<void> {
    for (const [tierLevel, config] of Object.entries(this.defaultCommissionRates)) {
      await prisma.commissionRule.upsert({
        where: { tierLevel },
        update: config,
        create: {
          tierLevel,
          ...config
        }
      })
    }
  }

  async generateReferralCode(request: ReferralCodeRequest): Promise<any> {
    const { userId, customCode } = request

    try {
      // Check if user already has an active referral code
      const existingReferral = await prisma.referral.findFirst({
        where: {
          referrerId: userId,
          status: 'PENDING'
        }
      })

      if (existingReferral) {
        return {
          code: existingReferral.code,
          referralId: existingReferral.id,
          created: false
        }
      }

      // Generate or validate custom code
      let code = customCode || this.generateRandomCode()
      
      if (customCode) {
        const codeExists = await prisma.referral.findUnique({
          where: { code: customCode }
        })

        if (codeExists) {
          throw new Error('Custom referral code already exists')
        }
      } else {
        // Ensure generated code is unique
        while (await prisma.referral.findUnique({ where: { code } })) {
          code = this.generateRandomCode()
        }
      }

      const referral = await prisma.referral.create({
        data: {
          referrerId: userId,
          code,
          email: '', // Will be filled when someone uses the code
          status: 'PENDING',
          commission: 0
        }
      })

      await auditService.log({
        userId,
        action: 'REFERRAL_CODE_GENERATED',
        resource: 'referrals',
        resourceId: referral.id,
        newData: { code }
      })

      return {
        code,
        referralId: referral.id,
        created: true
      }

    } catch (error) {
      console.error('Referral code generation failed:', error)
      throw error
    }
  }

  async trackReferral(code: string, email: string, metadata?: Record<string, any>): Promise<any> {
    try {
      const referral = await prisma.referral.findUnique({
        where: { code },
        include: { referrer: true }
      })

      if (!referral) {
        throw new Error('Invalid referral code')
      }

      if (referral.status !== 'PENDING') {
        throw new Error('Referral code has already been used')
      }

      // Update referral with email
      const updatedReferral = await prisma.referral.update({
        where: { id: referral.id },
        data: {
          email,
          status: 'CONFIRMED'
        }
      })

      await auditService.log({
        action: 'REFERRAL_TRACKED',
        resource: 'referrals',
        resourceId: referral.id,
        newData: { email, metadata }
      })

      // Notify referrer
      await notificationService.send({
        userId: referral.referrerId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Referral Tracked',
        message: `Someone has used your referral code! They will need to complete a purchase for you to earn a commission.`,
        channel: 'EMAIL',
        data: {
          referralCode: code,
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2') // Partially hide email
        }
      })

      return {
        referralId: updatedReferral.id,
        referrerName: `${referral.referrer.firstName} ${referral.referrer.lastName}`,
        discount: this.calculateReferralDiscount(referral.referrerId)
      }

    } catch (error) {
      console.error('Referral tracking failed:', error)
      throw error
    }
  }

  async processReferralSale(referralId: string, saleAmount: number, productType: string): Promise<void> {
    try {
      const referral = await prisma.referral.findUnique({
        where: { id: referralId },
        include: { referrer: true }
      })

      if (!referral) {
        throw new Error('Referral not found')
      }

      // Get referrer's tier level
      const tierLevel = await this.getReferrerTierLevel(referral.referrerId)
      const commissionRule = await prisma.commissionRule.findUnique({
        where: { tierLevel, isActive: true }
      })

      if (!commissionRule) {
        console.warn(`No commission rule found for tier ${tierLevel}`)
        return
      }

      // Check minimum sale requirement
      if (saleAmount < commissionRule.minimumSale) {
        console.log(`Sale amount ${saleAmount} below minimum ${commissionRule.minimumSale}`)
        return
      }

      // Calculate commission
      const commission = this.calculateCommission(saleAmount, commissionRule)

      // Update referral with commission
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          commission,
          status: 'PAID'
        }
      })

      await auditService.log({
        userId: referral.referrerId,
        action: 'COMMISSION_EARNED',
        resource: 'referrals',
        resourceId: referralId,
        newData: {
          saleAmount,
          commission,
          tierLevel,
          productType
        }
      })

      // Create commission payment (pending payout)
      await this.createCommissionPayment(referral.referrerId, commission, referralId)

      // Notify referrer
      await notificationService.send({
        userId: referral.referrerId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Commission Earned!',
        message: `Congratulations! You've earned $${commission.toFixed(2)} in commission from your referral.`,
        channel: 'EMAIL',
        data: {
          commission,
          saleAmount,
          referralCode: referral.code
        }
      })

    } catch (error) {
      console.error('Referral sale processing failed:', error)
      throw error
    }
  }

  async getReferralStats(userId: string): Promise<any> {
    try {
      const [
        totalReferrals,
        confirmedReferrals,
        totalCommissions,
        pendingCommissions,
        recentReferrals
      ] = await Promise.all([
        prisma.referral.count({
          where: { referrerId: userId }
        }),

        prisma.referral.count({
          where: {
            referrerId: userId,
            status: { in: ['CONFIRMED', 'PAID'] }
          }
        }),

        prisma.referral.aggregate({
          where: {
            referrerId: userId,
            status: 'PAID'
          },
          _sum: { commission: true }
        }),

        prisma.referral.aggregate({
          where: {
            referrerId: userId,
            status: 'CONFIRMED'
          },
          _sum: { commission: true }
        }),

        prisma.referral.findMany({
          where: { referrerId: userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            code: true,
            email: true,
            status: true,
            commission: true,
            createdAt: true,
            paidAt: true
          }
        })
      ])

      return {
        totalReferrals,
        confirmedReferrals,
        conversionRate: totalReferrals > 0 ? (confirmedReferrals / totalReferrals) * 100 : 0,
        totalEarnings: totalCommissions._sum.commission || 0,
        pendingEarnings: pendingCommissions._sum.commission || 0,
        recentReferrals
      }

    } catch (error) {
      console.error('Failed to get referral stats:', error)
      throw error
    }
  }

  async requestPayout(request: PayoutRequest): Promise<any> {
    const { referrerId, commissionIds, paymentMethod, paymentDetails } = request

    try {
      // Validate commissions belong to referrer and are unpaid
      const commissions = await prisma.referral.findMany({
        where: {
          id: { in: commissionIds },
          referrerId,
          status: 'PAID',
          paidAt: null
        }
      })

      if (commissions.length !== commissionIds.length) {
        throw new Error('Invalid or already paid commissions')
      }

      const totalAmount = commissions.reduce((sum, commission) => sum + commission.commission, 0)

      if (totalAmount < 25) { // Minimum payout threshold
        throw new Error('Minimum payout amount is $25')
      }

      // Create payout record
      const payout = await prisma.commissionPayout.create({
        data: {
          referrerId,
          amount: totalAmount,
          commissionIds,
          paymentMethod,
          paymentDetails,
          status: 'PENDING',
          requestedAt: new Date()
        }
      })

      await auditService.log({
        userId: referrerId,
        action: 'PAYOUT_REQUESTED',
        resource: 'commission_payouts',
        resourceId: payout.id,
        newData: {
          amount: totalAmount,
          commissionCount: commissions.length,
          paymentMethod
        }
      })

      // Notify admins
      await notificationService.sendToRole('ADMIN', {
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Commission Payout Requested',
        message: `Commission payout of $${totalAmount.toFixed(2)} requested by user ${referrerId}`,
        data: {
          payoutId: payout.id,
          amount: totalAmount,
          referrerId
        }
      })

      return {
        payoutId: payout.id,
        amount: totalAmount,
        status: 'PENDING',
        estimatedProcessingDays: this.getProcessingDays(paymentMethod)
      }

    } catch (error) {
      console.error('Payout request failed:', error)
      throw error
    }
  }

  async processPayout(payoutId: string, adminUserId: string, approved: boolean, notes?: string): Promise<void> {
    try {
      const payout = await prisma.commissionPayout.findUnique({
        where: { id: payoutId },
        include: { referrer: true }
      })

      if (!payout) {
        throw new Error('Payout not found')
      }

      if (payout.status !== 'PENDING') {
        throw new Error('Payout already processed')
      }

      const newStatus = approved ? 'APPROVED' : 'REJECTED'

      await prisma.commissionPayout.update({
        where: { id: payoutId },
        data: {
          status: newStatus,
          processedAt: new Date(),
          processedBy: adminUserId,
          notes
        }
      })

      if (approved) {
        // Mark commissions as paid
        await prisma.referral.updateMany({
          where: { id: { in: payout.commissionIds } },
          data: { paidAt: new Date() }
        })

        // In production, integrate with payment processor
        await this.processActualPayout(payout)
      }

      await auditService.log({
        userId: adminUserId,
        action: `PAYOUT_${newStatus}`,
        resource: 'commission_payouts',
        resourceId: payoutId,
        newData: { approved, notes }
      })

      // Notify referrer
      await notificationService.send({
        userId: payout.referrerId,
        type: approved ? 'PAYMENT_SUCCESS' : 'SYSTEM_ANNOUNCEMENT',
        title: approved ? 'Commission Payout Approved' : 'Commission Payout Rejected',
        message: approved 
          ? `Your commission payout of $${payout.amount.toFixed(2)} has been approved and is being processed.`
          : `Your commission payout request has been rejected. ${notes || ''}`,
        channel: 'EMAIL',
        data: {
          payoutId,
          amount: payout.amount,
          approved,
          notes
        }
      })

    } catch (error) {
      console.error('Payout processing failed:', error)
      throw error
    }
  }

  async getReferralAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const [
        totalReferrals,
        conversionStats,
        commissionStats,
        topReferrers,
        monthlyTrend
      ] = await Promise.all([
        prisma.referral.count({
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        }),

        prisma.referral.groupBy({
          by: ['status'],
          where: {
            createdAt: { gte: startDate, lte: endDate }
          },
          _count: { status: true }
        }),

        prisma.referral.aggregate({
          where: {
            status: 'PAID',
            createdAt: { gte: startDate, lte: endDate }
          },
          _sum: { commission: true }
        }),

        prisma.referral.groupBy({
          by: ['referrerId'],
          where: {
            status: 'PAID',
            createdAt: { gte: startDate, lte: endDate }
          },
          _sum: { commission: true },
          _count: { referrerId: true },
          orderBy: { _sum: { commission: 'desc' } },
          take: 10
        }),

        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as referral_count,
            SUM(CASE WHEN status = 'PAID' THEN commission ELSE 0 END) as total_commission
          FROM referrals 
          WHERE "createdAt" >= ${startDate} 
            AND "createdAt" <= ${endDate}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month
        `
      ])

      const confirmedReferrals = conversionStats.find(stat => stat.status === 'CONFIRMED')?._count.status || 0
      const conversionRate = totalReferrals > 0 ? (confirmedReferrals / totalReferrals) * 100 : 0

      return {
        totalReferrals,
        conversionRate,
        totalCommissions: commissionStats._sum.commission || 0,
        conversionStats: conversionStats.map(stat => ({
          status: stat.status,
          count: stat._count.status
        })),
        topReferrers,
        monthlyTrend
      }

    } catch (error) {
      console.error('Failed to get referral analytics:', error)
      throw error
    }
  }

  // Private helper methods
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private async getReferrerTierLevel(referrerId: string): Promise<string> {
    // Get user's referral performance to determine tier
    const stats = await prisma.referral.aggregate({
      where: {
        referrerId,
        status: 'PAID'
      },
      _count: { id: true },
      _sum: { commission: true }
    })

    const referralCount = stats._count.id || 0
    const totalCommissions = stats._sum.commission || 0

    // Determine tier based on performance
    if (referralCount >= 10 && totalCommissions >= 500) {
      return 'TIER_3'
    } else if (referralCount >= 5 && totalCommissions >= 200) {
      return 'TIER_2'
    } else {
      return 'TIER_1'
    }
  }

  private calculateCommission(saleAmount: number, rule: any): number {
    const percentageCommission = (saleAmount * rule.percentage) / 100
    return percentageCommission + rule.flatAmount
  }

  private calculateReferralDiscount(referrerId: string): number {
    // Offer discount to referred users
    return 10 // 10% discount
  }

  private async createCommissionPayment(referrerId: string, commission: number, referralId: string): Promise<void> {
    // This would create a pending payment record for the commission
    // In a full implementation, you'd have a separate commission payments table
  }

  private async processActualPayout(payout: any): Promise<void> {
    // In production, integrate with payment processors like:
    // - Stripe Express/Connect
    // - PayPal Payouts API
    // - Bank ACH transfers
    // - Check printing services

    console.log(`Processing payout: $${payout.amount} to ${payout.paymentMethod}`)
  }

  private getProcessingDays(paymentMethod: string): number {
    switch (paymentMethod) {
      case 'BANK_TRANSFER': return 2
      case 'PAYPAL': return 1
      case 'CHECK': return 7
      default: return 3
    }
  }
}

export const referralService = new ReferralService()