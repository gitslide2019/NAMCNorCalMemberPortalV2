// Centralized Notification System with multiple channels and templates

import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'
import twilio from 'twilio'
import webpush from 'web-push'

const prisma = new PrismaClient()

interface NotificationPayload {
  userId: string
  type: string
  title: string
  message: string
  data?: any
  channel?: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  scheduledFor?: Date
}

interface EmailConfig {
  to: string
  subject: string
  text?: string
  html?: string
  template?: string
  templateData?: any
}

interface SMSConfig {
  to: string
  message: string
}

interface PushConfig {
  subscription: any
  payload: any
  options?: any
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter
  private twilioClient: any
  private webPushConfigured = false

  constructor() {
    this.setupEmailTransporter()
    this.setupTwilioClient()
    this.setupWebPush()
  }

  private setupEmailTransporter(): void {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    }
  }

  private setupTwilioClient(): void {
    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
    }
  }

  private setupWebPush(): void {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + process.env.VAPID_EMAIL,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      )
      this.webPushConfigured = true
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      // Get user preferences
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          email: true,
          phone: true,
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Create in-app notification
      await this.createInAppNotification(payload)

      // Send based on channel preference and user settings
      const channel = payload.channel || 'IN_APP'

      if (channel === 'EMAIL' && user.emailNotifications && user.email) {
        await this.sendEmail(user.email, payload)
      }

      if (channel === 'SMS' && user.smsNotifications && user.phone) {
        await this.sendSMS(user.phone, payload)
      }

      if (channel === 'PUSH' && user.pushNotifications) {
        await this.sendPushNotification(payload.userId, payload)
      }

      // Handle scheduled notifications
      if (payload.scheduledFor) {
        await this.scheduleNotification(payload)
      }

    } catch (error) {
      console.error('Failed to send notification:', error)
      throw error
    }
  }

  async sendBulk(userIds: string[], payload: Omit<NotificationPayload, 'userId'>): Promise<void> {
    const notifications = userIds.map(userId => ({
      ...payload,
      userId
    }))

    // Process in batches to avoid overwhelming the system
    const batchSize = 50
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      await Promise.allSettled(
        batch.map(notification => this.send(notification))
      )
    }
  }

  async sendToRole(roleName: string, payload: Omit<NotificationPayload, 'userId'>): Promise<void> {
    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: roleName
            }
          }
        }
      },
      select: { id: true }
    })

    const userIds = users.map(user => user.id)
    await this.sendBulk(userIds, payload)
  }

  private async createInAppNotification(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as any,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        channel: 'IN_APP'
      }
    })
  }

  private async sendEmail(email: string, payload: NotificationPayload): Promise<void> {
    if (!this.emailTransporter) {
      console.warn('Email transporter not configured')
      return
    }

    try {
      // Try to find a template for this notification type
      const template = await this.getEmailTemplate(payload.type)
      
      let emailConfig: EmailConfig = {
        to: email,
        subject: payload.title,
        text: payload.message
      }

      if (template) {
        emailConfig = await this.renderEmailTemplate(template, payload)
        emailConfig.to = email
      }

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@namcnorcal.org',
        to: emailConfig.to,
        subject: emailConfig.subject,
        text: emailConfig.text,
        html: emailConfig.html
      })

    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }

  private async sendSMS(phone: string, payload: NotificationPayload): Promise<void> {
    if (!this.twilioClient) {
      console.warn('Twilio client not configured')
      return
    }

    try {
      await this.twilioClient.messages.create({
        to: phone,
        from: process.env.TWILIO_PHONE,
        body: `${payload.title}\n\n${payload.message}`
      })
    } catch (error) {
      console.error('Failed to send SMS:', error)
      throw error
    }
  }

  private async sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    if (!this.webPushConfigured) {
      console.warn('Web push not configured')
      return
    }

    try {
      // Get user's push subscriptions (you'd need to store these)
      // This is a simplified example
      const subscriptions = await this.getUserPushSubscriptions(userId)

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.message,
        data: payload.data || {}
      })

      const promises = subscriptions.map(subscription =>
        webpush.sendNotification(subscription, pushPayload)
      )

      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Failed to send push notification:', error)
      throw error
    }
  }

  private async scheduleNotification(payload: NotificationPayload): Promise<void> {
    // In a production system, you'd use a job queue like Bull or Agenda
    // For now, we'll use a simple setTimeout approach (not production-ready)
    const delay = payload.scheduledFor!.getTime() - Date.now()
    
    if (delay > 0) {
      setTimeout(async () => {
        const { scheduledFor, ...immediatePayload } = payload
        await this.send(immediatePayload)
      }, delay)
    }
  }

  private async getEmailTemplate(type: string): Promise<any> {
    return await prisma.notificationTemplate.findFirst({
      where: {
        type: type as any,
        isActive: true
      }
    })
  }

  private async renderEmailTemplate(template: any, payload: NotificationPayload): Promise<EmailConfig> {
    // Simple template rendering - in production, use a proper template engine
    let subject = template.subject
    let body = template.template

    // Replace placeholders
    const replacements = {
      '{{title}}': payload.title,
      '{{message}}': payload.message,
      '{{user_name}}': payload.data?.userName || '',
      '{{company}}': payload.data?.company || '',
      ...payload.data
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      body = body.replace(new RegExp(placeholder, 'g'), value)
    }

    return {
      to: '',
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, '') // Strip HTML for text version
    }
  }

  private async getUserPushSubscriptions(userId: string): Promise<any[]> {
    // This would fetch push subscriptions from a database table
    // For now, return empty array
    return []
  }

  // Notification management methods
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  async getUserNotifications(userId: string, options: {
    page?: number
    limit?: number
    unreadOnly?: boolean
    type?: string
  } = {}): Promise<any> {
    const { page = 1, limit = 20, unreadOnly = false, type } = options
    const skip = (page - 1) * limit

    const where: any = { userId }
    if (unreadOnly) where.isRead = false
    if (type) where.type = type

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ])

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId: userId
      }
    })
  }

  // Template management
  async createTemplate(data: {
    name: string
    type: string
    subject: string
    template: string
  }): Promise<any> {
    return await prisma.notificationTemplate.create({
      data: {
        name: data.name,
        type: data.type as any,
        subject: data.subject,
        template: data.template
      }
    })
  }

  async updateTemplate(id: string, data: Partial<{
    subject: string
    template: string
    isActive: boolean
  }>): Promise<any> {
    return await prisma.notificationTemplate.update({
      where: { id },
      data
    })
  }

  // Event-driven notifications
  async onMembershipExpiring(userId: string, daysLeft: number): Promise<void> {
    await this.send({
      userId,
      type: 'MEMBERSHIP_EXPIRY',
      title: 'Membership Expiring Soon',
      message: `Your membership expires in ${daysLeft} days. Renew now to continue enjoying member benefits.`,
      channel: 'EMAIL',
      priority: 'HIGH'
    })
  }

  async onPaymentSuccess(userId: string, amount: number, description: string): Promise<void> {
    await this.send({
      userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Payment Successful',
      message: `Your payment of $${amount.toFixed(2)} for ${description} has been processed successfully.`,
      channel: 'EMAIL',
      data: { amount, description }
    })
  }

  async onCourseCompleted(userId: string, courseName: string): Promise<void> {
    await this.send({
      userId,
      type: 'COURSE_COMPLETED',
      title: 'Course Completed!',
      message: `Congratulations! You have successfully completed the course: ${courseName}`,
      channel: 'EMAIL',
      data: { courseName }
    })
  }

  async onProjectAssigned(userId: string, projectTitle: string): Promise<void> {
    await this.send({
      userId,
      type: 'PROJECT_ASSIGNED',
      title: 'New Project Assignment',
      message: `You have been assigned to project: ${projectTitle}`,
      channel: 'EMAIL',
      priority: 'HIGH',
      data: { projectTitle }
    })
  }
}

export const notificationService = new NotificationService()