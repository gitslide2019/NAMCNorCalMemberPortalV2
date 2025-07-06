// Comprehensive Payment Gateway Integration with Stripe

import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { notificationService } from './notificationService'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

interface PaymentRequest {
  userId: string
  amount: number
  currency?: string
  description: string
  paymentMethodId?: string
  membershipTierId?: string
  metadata?: Record<string, string>
}

interface RefundRequest {
  paymentId: string
  amount?: number
  reason?: string
  adminUserId: string
}

interface SubscriptionRequest {
  userId: string
  priceId: string
  paymentMethodId: string
  metadata?: Record<string, string>
}

export class PaymentService {
  private webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  async createPaymentIntent(request: PaymentRequest): Promise<any> {
    const { userId, amount, currency = 'usd', description, paymentMethodId, metadata } = request

    try {
      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(userId)

      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customer.id,
        description,
        metadata: {
          userId,
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      }

      if (paymentMethodId) {
        paymentIntentData.payment_method = paymentMethodId
        paymentIntentData.confirm = true
        paymentIntentData.return_url = `${process.env.FRONTEND_URL}/payment/success`
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          currency,
          status: 'PENDING',
          paymentMethod: 'STRIPE',
          stripePaymentId: paymentIntent.id,
          description,
          metadata: metadata || {},
          membershipTierId: request.membershipTierId
        }
      })

      await auditService.log({
        userId,
        action: 'PAYMENT_INITIATED',
        resource: 'payments',
        resourceId: payment.id,
        newData: { amount, description, stripePaymentId: paymentIntent.id }
      })

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status
      }

    } catch (error) {
      console.error('Payment intent creation failed:', error)
      throw new Error('Failed to create payment intent')
    }
  }

  async processPayment(request: PaymentRequest): Promise<any> {
    const { userId, amount, description, paymentMethodId } = request

    if (!paymentMethodId) {
      throw new Error('Payment method is required')
    }

    try {
      const customer = await this.getOrCreateStripeCustomer(userId)

      // Attach payment method to customer if not already attached
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id
        })
      } catch (error) {
        // Payment method might already be attached
        if (!error.message.includes('already been attached')) {
          throw error
        }
      }

      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: request.currency || 'usd',
        customer: customer.id,
        payment_method: paymentMethodId,
        description,
        confirm: true,
        metadata: {
          userId,
          ...(request.metadata || {})
        }
      })

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          currency: request.currency || 'USD',
          status: this.mapStripeStatus(paymentIntent.status),
          paymentMethod: 'STRIPE',
          stripePaymentId: paymentIntent.id,
          description,
          metadata: request.metadata || {},
          membershipTierId: request.membershipTierId
        }
      })

      if (paymentIntent.status === 'succeeded') {
        await this.handleSuccessfulPayment(payment.id, paymentIntent)
      }

      return payment

    } catch (error) {
      console.error('Payment processing failed:', error)
      throw new Error(`Payment failed: ${error.message}`)
    }
  }

  async createSubscription(request: SubscriptionRequest): Promise<any> {
    const { userId, priceId, paymentMethodId, metadata } = request

    try {
      const customer = await this.getOrCreateStripeCustomer(userId)

      // Attach payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id
      })

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      })

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        metadata: {
          userId,
          ...metadata
        },
        expand: ['latest_invoice.payment_intent']
      })

      // Create subscription record in database
      // This would require a Subscription model in your schema

      await auditService.log({
        userId,
        action: 'SUBSCRIPTION_CREATED',
        resource: 'subscriptions',
        resourceId: subscription.id,
        newData: { priceId, subscriptionId: subscription.id }
      })

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
      }

    } catch (error) {
      console.error('Subscription creation failed:', error)
      throw new Error('Failed to create subscription')
    }
  }

  async refundPayment(request: RefundRequest): Promise<any> {
    const { paymentId, amount, reason, adminUserId } = request

    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      })

      if (!payment) {
        throw new Error('Payment not found')
      }

      if (payment.status !== 'COMPLETED') {
        throw new Error('Cannot refund incomplete payment')
      }

      const refundAmount = amount ? Math.round(amount * 100) : undefined

      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentId!,
        amount: refundAmount,
        reason: reason as any || 'requested_by_customer',
        metadata: {
          originalPaymentId: paymentId,
          adminUserId
        }
      })

      // Update payment status
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: amount && amount < payment.amount ? 'COMPLETED' : 'REFUNDED'
        }
      })

      await auditService.log({
        userId: adminUserId,
        action: 'PAYMENT_REFUNDED',
        resource: 'payments',
        resourceId: paymentId,
        newData: {
          refundId: refund.id,
          refundAmount: refund.amount / 100,
          reason
        }
      })

      // Notify customer
      await notificationService.send({
        userId: payment.userId,
        type: 'PAYMENT_SUCCESS',
        title: 'Refund Processed',
        message: `A refund of $${(refund.amount / 100).toFixed(2)} has been processed for your payment.`,
        channel: 'EMAIL'
      })

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }

    } catch (error) {
      console.error('Refund failed:', error)
      throw new Error(`Refund failed: ${error.message}`)
    }
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
          break

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
          break

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break

        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }

    } catch (error) {
      console.error('Webhook handling failed:', error)
      throw error
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id }
    })

    if (payment) {
      await this.handleSuccessfulPayment(payment.id, paymentIntent)
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id }
    })

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      })

      await auditService.log({
        userId: payment.userId,
        action: 'PAYMENT_FAILED',
        resource: 'payments',
        resourceId: payment.id,
        newData: { stripePaymentId: paymentIntent.id }
      })

      await notificationService.send({
        userId: payment.userId,
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please try again or contact support.',
        channel: 'EMAIL'
      })
    }
  }

  private async handleSuccessfulPayment(paymentId: string, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED' }
    })

    await auditService.log({
      userId: payment.userId,
      action: 'PAYMENT_COMPLETED',
      resource: 'payments',
      resourceId: payment.id,
      newData: { stripePaymentId: paymentIntent.id }
    })

    await notificationService.onPaymentSuccess(
      payment.userId,
      payment.amount,
      payment.description
    )

    // If this was a membership payment, handle membership update
    if (payment.membershipTierId) {
      await this.handleMembershipPayment(payment)
    }
  }

  private async handleMembershipPayment(payment: any): Promise<void> {
    const membershipTier = await prisma.membershipTier.findUnique({
      where: { id: payment.membershipTierId }
    })

    if (membershipTier) {
      const expiryDate = membershipTier.duration > 0
        ? new Date(Date.now() + membershipTier.duration * 30 * 24 * 60 * 60 * 1000)
        : null

      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          memberType: membershipTier.name as any,
          membershipExpiresAt: expiryDate
        }
      })
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Handle subscription payment success
    console.log('Subscription payment succeeded:', invoice.id)
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId
    if (userId) {
      // Handle subscription cancellation
      await notificationService.send({
        userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. You will retain access until the end of your current billing period.',
        channel: 'EMAIL'
      })
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const userId = invoice.metadata?.userId
    if (userId) {
      await notificationService.send({
        userId,
        type: 'PAYMENT_FAILED',
        title: 'Subscription Payment Failed',
        message: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
        channel: 'EMAIL',
        priority: 'HIGH'
      })
    }
  }

  private async getOrCreateStripeCustomer(userId: string): Promise<Stripe.Customer> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user already has a Stripe customer ID
    // You'd need to add a stripeCustomerId field to your User model
    
    // For now, create a new customer each time (in production, store the customer ID)
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user.id
      }
    })

    return customer
  }

  private mapStripeStatus(stripeStatus: string): string {
    const statusMap = {
      'requires_payment_method': 'PENDING',
      'requires_confirmation': 'PENDING',
      'requires_action': 'PROCESSING',
      'processing': 'PROCESSING',
      'succeeded': 'COMPLETED',
      'requires_capture': 'PROCESSING',
      'canceled': 'CANCELLED'
    }

    return statusMap[stripeStatus] || 'PENDING'
  }

  async getPaymentHistory(userId: string, options: {
    page?: number
    limit?: number
    status?: string
  } = {}): Promise<any> {
    const { page = 1, limit = 20, status } = options
    const skip = (page - 1) * limit

    const where: any = { userId }
    if (status) where.status = status

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          membershipTier: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ])

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getPaymentAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const [
      totalRevenue,
      paymentCount,
      successRate,
      revenueByMethod,
      monthlyTrend
    ] = await Promise.all([
      // Total revenue
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),

      // Payment count
      prisma.payment.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),

      // Success rate
      prisma.payment.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { status: true }
      }),

      // Revenue by payment method
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true },
        _count: { paymentMethod: true }
      }),

      // Monthly revenue trend (simplified)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM(amount) as revenue,
          COUNT(*) as payment_count
        FROM payments 
        WHERE status = 'COMPLETED' 
          AND "createdAt" >= ${startDate} 
          AND "createdAt" <= ${endDate}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `
    ])

    const totalPayments = successRate.reduce((sum, stat) => sum + stat._count.status, 0)
    const successfulPayments = successRate.find(stat => stat.status === 'COMPLETED')?._count.status || 0

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      paymentCount,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      revenueByMethod: revenueByMethod.map(method => ({
        method: method.paymentMethod,
        revenue: method._sum.amount,
        count: method._count.paymentMethod
      })),
      monthlyTrend
    }
  }
}

export const paymentService = new PaymentService()