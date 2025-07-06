// Comprehensive Membership Lifecycle Management System

import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { notificationService } from './notificationService'
import { paymentService } from './paymentService'

const prisma = new PrismaClient()

interface MembershipUpgradeRequest {
  userId: string
  targetTier: string
  promoCode?: string
  paymentMethodId?: string
}

interface MembershipRenewalRequest {
  userId: string
  months?: number
  paymentMethodId?: string
  autoRenew?: boolean
}

interface FeedbackSubmission {
  userId: string
  type: 'GENERAL' | 'SERVICE' | 'EVENT' | 'PLATFORM' | 'SUGGESTION'
  rating: number // 1-5 scale
  subject: string
  message: string
  category?: string
  anonymous?: boolean
}

export class MembershipService {
  private readonly membershipTiers = {
    'REGULAR': { price: 0, duration: 12, benefits: ['Basic access', 'Monthly newsletter'] },
    'PREMIUM': { price: 99, duration: 12, benefits: ['Premium access', 'Priority support', 'Exclusive events'] },
    'LIFETIME': { price: 999, duration: -1, benefits: ['Lifetime access', 'All premium benefits', 'VIP status'] },
    'HONORARY': { price: 0, duration: -1, benefits: ['Honorary status', 'All premium benefits'] }
  }

  async createMembershipTiers(): Promise<void> {
    for (const [name, config] of Object.entries(this.membershipTiers)) {
      await prisma.membershipTier.upsert({
        where: { name },
        update: config,
        create: {
          name,
          description: `${name} membership tier`,
          ...config
        }
      })
    }
  }

  async getMembershipStatus(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        memberType: true,
        memberSince: true,
        membershipExpiresAt: true,
        isActive: true
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const isExpired = user.membershipExpiresAt && user.membershipExpiresAt < new Date()
    const daysUntilExpiry = user.membershipExpiresAt 
      ? Math.ceil((user.membershipExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    return {
      currentTier: user.memberType,
      memberSince: user.memberSince,
      expiresAt: user.membershipExpiresAt,
      isExpired,
      daysUntilExpiry,
      isActive: user.isActive,
      benefits: this.membershipTiers[user.memberType]?.benefits || []
    }
  }

  async upgradeMembership(request: MembershipUpgradeRequest): Promise<any> {
    const { userId, targetTier, promoCode, paymentMethodId } = request

    // Validate target tier
    if (!this.membershipTiers[targetTier]) {
      throw new Error('Invalid membership tier')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if upgrade is valid
    const currentTierOrder = this.getTierOrder(user.memberType)
    const targetTierOrder = this.getTierOrder(targetTier)

    if (targetTierOrder <= currentTierOrder) {
      throw new Error('Cannot downgrade or stay on same tier')
    }

    const tierConfig = this.membershipTiers[targetTier]
    let amount = tierConfig.price
    
    // Apply promo code if provided
    if (promoCode) {
      const discount = await this.validateAndApplyPromoCode(promoCode, amount)
      amount = discount.discountedAmount
    }

    // Process payment if required
    let paymentId = null
    if (amount > 0) {
      const payment = await paymentService.processPayment({
        userId,
        amount,
        description: `Membership upgrade to ${targetTier}`,
        paymentMethodId
      })
      paymentId = payment.id
    }

    // Calculate new expiry date
    const newExpiryDate = tierConfig.duration > 0 
      ? new Date(Date.now() + tierConfig.duration * 30 * 24 * 60 * 60 * 1000)
      : null

    // Update user membership
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        memberType: targetTier,
        membershipExpiresAt: newExpiryDate
      }
    })

    // Create renewal record
    await prisma.membershipRenewal.create({
      data: {
        userId,
        oldTier: user.memberType,
        newTier: targetTier,
        renewalDate: new Date(),
        expiryDate: newExpiryDate || new Date('2099-12-31'),
        amount,
        status: 'APPROVED'
      }
    })

    // Log audit trail
    await auditService.log({
      userId,
      action: 'MEMBERSHIP_UPGRADED',
      resource: 'memberships',
      resourceId: userId,
      oldData: { memberType: user.memberType },
      newData: { memberType: targetTier, amount, paymentId }
    })

    // Send notification
    await notificationService.send({
      userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Membership Upgraded Successfully',
      message: `Your membership has been upgraded to ${targetTier}. Welcome to your new benefits!`,
      channel: 'EMAIL',
      data: {
        oldTier: user.memberType,
        newTier: targetTier,
        benefits: tierConfig.benefits
      }
    })

    return {
      success: true,
      oldTier: user.memberType,
      newTier: targetTier,
      expiresAt: newExpiryDate,
      amountPaid: amount,
      paymentId
    }
  }

  async renewMembership(request: MembershipRenewalRequest): Promise<any> {
    const { userId, months = 12, paymentMethodId, autoRenew = false } = request

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const tierConfig = this.membershipTiers[user.memberType]
    if (!tierConfig) {
      throw new Error('Invalid membership tier')
    }

    // Calculate renewal cost
    const monthlyRate = tierConfig.price / (tierConfig.duration || 12)
    const renewalCost = monthlyRate * months

    // Process payment
    let paymentId = null
    if (renewalCost > 0) {
      const payment = await paymentService.processPayment({
        userId,
        amount: renewalCost,
        description: `Membership renewal for ${months} months`,
        paymentMethodId
      })
      paymentId = payment.id
    }

    // Calculate new expiry date
    const currentExpiry = user.membershipExpiresAt || new Date()
    const startDate = currentExpiry > new Date() ? currentExpiry : new Date()
    const newExpiryDate = new Date(startDate.getTime() + months * 30 * 24 * 60 * 60 * 1000)

    // Update user membership
    await prisma.user.update({
      where: { id: userId },
      data: {
        membershipExpiresAt: newExpiryDate
      }
    })

    // Create renewal record
    await prisma.membershipRenewal.create({
      data: {
        userId,
        oldTier: user.memberType,
        newTier: user.memberType,
        renewalDate: new Date(),
        expiryDate: newExpiryDate,
        amount: renewalCost,
        status: 'APPROVED'
      }
    })

    // Log audit trail
    await auditService.log({
      userId,
      action: 'MEMBERSHIP_RENEWED',
      resource: 'memberships',
      resourceId: userId,
      newData: { months, amount: renewalCost, newExpiry: newExpiryDate }
    })

    // Send notification
    await notificationService.send({
      userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Membership Renewed Successfully',
      message: `Your ${user.memberType} membership has been renewed for ${months} months.`,
      channel: 'EMAIL',
      data: {
        months,
        amount: renewalCost,
        expiresAt: newExpiryDate
      }
    })

    return {
      success: true,
      renewalMonths: months,
      amountPaid: renewalCost,
      newExpiryDate,
      paymentId
    }
  }

  async checkExpiringMemberships(): Promise<void> {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get memberships expiring in 30, 7, and 1 days
    const [expiring30, expiring7, expiring1] = await Promise.all([
      prisma.user.findMany({
        where: {
          membershipExpiresAt: {
            gte: new Date(thirtyDaysFromNow.getTime() - 24 * 60 * 60 * 1000),
            lte: thirtyDaysFromNow
          },
          memberType: { not: 'LIFETIME' }
        }
      }),
      prisma.user.findMany({
        where: {
          membershipExpiresAt: {
            gte: new Date(sevenDaysFromNow.getTime() - 24 * 60 * 60 * 1000),
            lte: sevenDaysFromNow
          },
          memberType: { not: 'LIFETIME' }
        }
      }),
      prisma.user.findMany({
        where: {
          membershipExpiresAt: {
            gte: new Date(tomorrow.getTime() - 24 * 60 * 60 * 1000),
            lte: tomorrow
          },
          memberType: { not: 'LIFETIME' }
        }
      })
    ])

    // Send notifications
    for (const user of expiring30) {
      await notificationService.onMembershipExpiring(user.id, 30)
    }

    for (const user of expiring7) {
      await notificationService.onMembershipExpiring(user.id, 7)
    }

    for (const user of expiring1) {
      await notificationService.onMembershipExpiring(user.id, 1)
    }
  }

  async suspendMembership(userId: string, reason: string, adminUserId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    })

    await auditService.log({
      userId: adminUserId,
      action: 'MEMBERSHIP_SUSPENDED',
      resource: 'memberships',
      resourceId: userId,
      newData: { reason }
    })

    await notificationService.send({
      userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Membership Suspended',
      message: `Your membership has been suspended. Reason: ${reason}`,
      channel: 'EMAIL',
      priority: 'HIGH'
    })
  }

  async reactivateMembership(userId: string, adminUserId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    })

    await auditService.log({
      userId: adminUserId,
      action: 'MEMBERSHIP_REACTIVATED',
      resource: 'memberships',
      resourceId: userId
    })

    await notificationService.send({
      userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Membership Reactivated',
      message: 'Your membership has been reactivated. Welcome back!',
      channel: 'EMAIL'
    })
  }

  async submitFeedback(feedback: FeedbackSubmission): Promise<any> {
    // Create feedback record
    const feedbackRecord = await prisma.memberFeedback.create({
      data: {
        userId: feedback.anonymous ? null : feedback.userId,
        type: feedback.type,
        rating: feedback.rating,
        subject: feedback.subject,
        message: feedback.message,
        category: feedback.category,
        status: 'PENDING',
        submittedAt: new Date()
      }
    })

    // Log audit trail
    await auditService.log({
      userId: feedback.userId,
      action: 'FEEDBACK_SUBMITTED',
      resource: 'feedback',
      resourceId: feedbackRecord.id,
      newData: {
        type: feedback.type,
        rating: feedback.rating,
        anonymous: feedback.anonymous
      }
    })

    // Notify admins of new feedback
    await notificationService.sendToRole('ADMIN', {
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'New Member Feedback Received',
      message: `New ${feedback.type.toLowerCase()} feedback received with rating: ${feedback.rating}/5`,
      data: {
        feedbackId: feedbackRecord.id,
        type: feedback.type,
        rating: feedback.rating
      }
    })

    return {
      success: true,
      feedbackId: feedbackRecord.id,
      message: 'Feedback submitted successfully'
    }
  }

  async processFeedback(feedbackId: string, status: string, response?: string, adminUserId?: string): Promise<void> {
    const feedback = await prisma.memberFeedback.update({
      where: { id: feedbackId },
      data: {
        status,
        response,
        processedAt: new Date(),
        processedBy: adminUserId
      },
      include: {
        user: true
      }
    })

    if (feedback.userId && response) {
      await notificationService.send({
        userId: feedback.userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Feedback Response',
        message: `Thank you for your feedback. We have reviewed your submission and provided a response.`,
        channel: 'EMAIL',
        data: {
          originalFeedback: feedback.subject,
          response
        }
      })
    }

    await auditService.log({
      userId: adminUserId,
      action: 'FEEDBACK_PROCESSED',
      resource: 'feedback',
      resourceId: feedbackId,
      newData: { status, response }
    })
  }

  async getMembershipAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const [
      totalMembers,
      membersByTier,
      newMemberships,
      renewals,
      revenue,
      feedbackStats
    ] = await Promise.all([
      // Total active members
      prisma.user.count({
        where: { isActive: true }
      }),

      // Members by tier
      prisma.user.groupBy({
        by: ['memberType'],
        where: { isActive: true },
        _count: { memberType: true }
      }),

      // New memberships in period
      prisma.user.count({
        where: {
          memberSince: {
            gte: startDate,
            lte: endDate
          }
        }
      }),

      // Renewals in period
      prisma.membershipRenewal.count({
        where: {
          renewalDate: {
            gte: startDate,
            lte: endDate
          }
        }
      }),

      // Revenue from memberships
      prisma.payment.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED',
          membershipTierId: { not: null }
        },
        _sum: { amount: true }
      }),

      // Feedback statistics
      prisma.memberFeedback.groupBy({
        by: ['rating'],
        where: {
          submittedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: { rating: true }
      })
    ])

    return {
      totalMembers,
      membersByTier: membersByTier.map(tier => ({
        tier: tier.memberType,
        count: tier._count.memberType
      })),
      newMemberships,
      renewals,
      revenue: revenue._sum.amount || 0,
      feedbackStats: {
        total: feedbackStats.reduce((sum, stat) => sum + stat._count.rating, 0),
        averageRating: feedbackStats.length > 0 
          ? feedbackStats.reduce((sum, stat) => sum + (stat.rating * stat._count.rating), 0) / 
            feedbackStats.reduce((sum, stat) => sum + stat._count.rating, 0)
          : 0,
        distribution: feedbackStats
      }
    }
  }

  private getTierOrder(tier: string): number {
    const order = { 'REGULAR': 1, 'PREMIUM': 2, 'LIFETIME': 3, 'HONORARY': 4 }
    return order[tier] || 0
  }

  private async validateAndApplyPromoCode(code: string, amount: number): Promise<any> {
    // This would implement promo code validation
    // For now, return the original amount
    return { discountedAmount: amount, discount: 0 }
  }
}

export const membershipService = new MembershipService()