// Enhanced Authentication Service with RBAC and security features

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import speakeasy from 'speakeasy'
import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { notificationService } from './notificationService'

const prisma = new PrismaClient()

interface LoginResult {
  user: any
  accessToken: string
  refreshToken: string
  requiresTwoFactor?: boolean
  twoFactorToken?: string
}

interface RegistrationData {
  email: string
  password: string
  firstName: string
  lastName: string
  company?: string
  phone?: string
  referralCode?: string
}

export class AuthService {
  private readonly saltRounds = 12
  private readonly maxFailedAttempts = 5
  private readonly lockoutDuration = 30 * 60 * 1000 // 30 minutes
  private readonly tokenExpiry = 15 * 60 // 15 minutes
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 // 7 days

  async register(data: RegistrationData, ipAddress?: string): Promise<{ user: any, verificationToken: string }> {
    const { email, password, firstName, lastName, company, phone, referralCode } = data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Validate referral code if provided
    let referrer = null
    if (referralCode) {
      const referral = await prisma.referral.findUnique({
        where: { code: referralCode },
        include: { referrer: true }
      })

      if (!referral || referral.status !== 'PENDING') {
        throw new Error('Invalid or expired referral code')
      }
      referrer = referral.referrer
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        company,
        phone,
        memberType: 'REGULAR',
        isVerified: false
      }
    })

    // Assign default role
    const defaultRole = await prisma.role.findUnique({
      where: { name: 'MEMBER' }
    })

    if (defaultRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id
        }
      })
    }

    // Handle referral
    if (referrer && referralCode) {
      await prisma.referral.update({
        where: { code: referralCode },
        data: {
          referredId: user.id,
          status: 'CONFIRMED'
        }
      })
    }

    // Log registration
    await auditService.log({
      action: 'USER_REGISTRATION',
      resource: 'users',
      resourceId: user.id,
      userId: user.id,
      newData: { email, firstName, lastName },
      ipAddress
    })

    // Send welcome notification
    await notificationService.send({
      userId: user.id,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Welcome to NAMC NorCal!',
      message: 'Your account has been created. Please verify your email to get started.',
      channel: 'EMAIL'
    })

    return { user: this.sanitizeUser(user), verificationToken }
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new Error(`Account locked. Try again in ${remainingTime} minutes`)
    }

    // Check if account is active
    if (!user.isActive) {
      throw new Error('Account has been deactivated')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      await this.handleFailedLogin(user.id, ipAddress)
      throw new Error('Invalid credentials')
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastSuccessfulLogin: new Date()
      }
    })

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const twoFactorToken = this.generateTwoFactorToken(user.id)
      
      await auditService.log({
        action: 'LOGIN_2FA_REQUIRED',
        resource: 'users',
        resourceId: user.id,
        userId: user.id,
        ipAddress,
        userAgent
      })

      return {
        user: this.sanitizeUser(user),
        accessToken: '',
        refreshToken: '',
        requiresTwoFactor: true,
        twoFactorToken
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user)

    await auditService.log({
      action: 'LOGIN_SUCCESS',
      resource: 'users',
      resourceId: user.id,
      userId: user.id,
      ipAddress,
      userAgent
    })

    return {
      user: this.sanitizeUser(user),
      ...tokens
    }
  }

  async verifyTwoFactor(twoFactorToken: string, code: string, ipAddress?: string): Promise<LoginResult> {
    try {
      const payload = jwt.verify(twoFactorToken, process.env.JWT_SECRET!) as any
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!user || !user.twoFactorSecret) {
        throw new Error('Invalid two-factor authentication setup')
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      })

      if (!verified) {
        await auditService.log({
          action: 'LOGIN_2FA_FAILED',
          resource: 'users',
          resourceId: user.id,
          userId: user.id,
          ipAddress
        })
        throw new Error('Invalid two-factor authentication code')
      }

      const tokens = await this.generateTokens(user)

      await auditService.log({
        action: 'LOGIN_2FA_SUCCESS',
        resource: 'users',
        resourceId: user.id,
        userId: user.id,
        ipAddress
      })

      return {
        user: this.sanitizeUser(user),
        ...tokens
      }
    } catch (error) {
      throw new Error('Invalid or expired two-factor token')
    }
  }

  async setupTwoFactor(userId: string): Promise<{ secret: string, qrCode: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const secret = speakeasy.generateSecret({
      name: `NAMC NorCal (${user.email})`,
      issuer: 'NAMC NorCal'
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32
      }
    })

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url!
    }
  }

  async enableTwoFactor(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.twoFactorSecret) {
      throw new Error('Two-factor setup not found')
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    })

    if (!verified) {
      throw new Error('Invalid verification code')
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true
      }
    })

    await auditService.log({
      action: 'TWO_FACTOR_ENABLED',
      resource: 'users',
      resourceId: userId,
      userId
    })
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token')
      }

      return await this.generateTokens(user)
    } catch (error) {
      throw new Error('Invalid or expired refresh token')
    }
  }

  async logout(userId: string, ipAddress?: string): Promise<void> {
    await auditService.log({
      action: 'LOGOUT',
      resource: 'users',
      resourceId: userId,
      userId,
      ipAddress
    })
  }

  async resetPasswordRequest(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // Don't reveal if email exists for security
      return 'If the email exists, a reset link has been sent'
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Store reset token (in production, use a separate table or Redis)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // You'd need to add these fields to the schema
        // resetToken,
        // resetTokenExpiry: resetExpiry
      }
    })

    await notificationService.send({
      userId: user.id,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Password Reset Request',
      message: `Click the link to reset your password. This link expires in 1 hour.`,
      channel: 'EMAIL'
    })

    return resetToken
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Implementation would verify token and update password
    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds)
    
    // Update password and clear reset token
    // Implementation depends on how reset tokens are stored
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      throw new Error('Current password is incorrect')
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds)

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    })

    await auditService.log({
      action: 'PASSWORD_CHANGED',
      resource: 'users',
      resourceId: userId,
      userId
    })
  }

  private async handleFailedLogin(userId: string, ipAddress?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) return

    const attempts = (user.failedLoginAttempts || 0) + 1
    const updateData: any = {
      failedLoginAttempts: attempts,
      lastFailedLogin: new Date()
    }

    if (attempts >= this.maxFailedAttempts) {
      updateData.lockedUntil = new Date(Date.now() + this.lockoutDuration)
      
      await notificationService.send({
        userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Account Locked',
        message: 'Your account has been locked due to multiple failed login attempts.',
        channel: 'EMAIL'
      })
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    await auditService.log({
      action: 'LOGIN_FAILED',
      resource: 'users',
      resourceId: userId,
      userId,
      newData: { attempts },
      ipAddress
    })
  }

  private async generateTokens(user: any): Promise<{ accessToken: string, refreshToken: string }> {
    const permissions = this.extractPermissions(user.roles)
    
    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((ur: any) => ur.role.name),
      permissions
    }

    const refreshTokenPayload = {
      userId: user.id,
      type: 'refresh'
    }

    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET!, {
      expiresIn: this.tokenExpiry
    })

    const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: this.refreshTokenExpiry
    })

    return { accessToken, refreshToken }
  }

  private generateTwoFactorToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'two_factor' },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' }
    )
  }

  private extractPermissions(userRoles: any[]): string[] {
    const permissions = new Set<string>()
    
    userRoles.forEach(userRole => {
      userRole.role.permissions.forEach((rp: any) => {
        permissions.add(`${rp.permission.resource}:${rp.permission.action}`)
      })
    })

    return Array.from(permissions)
  }

  private sanitizeUser(user: any): any {
    const { password, twoFactorSecret, ...sanitized } = user
    return sanitized
  }
}

export const authService = new AuthService()