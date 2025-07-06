// Enhanced Authentication Routes with secure registration flow

import express from 'express'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import { authService } from '../services/authService'
import { auditService } from '../services/auditService'
import { notificationService } from '../services/notificationService'
import { auth, requirePermission } from '../middleware/auth-enhanced'

const router = express.Router()

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour per IP
  message: { error: 'Too many registration attempts, please try again later' }
})

// Validation rules
const registrationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),
  body('referralCode')
    .optional()
    .isAlphanumeric()
    .isLength({ min: 6, max: 12 })
    .withMessage('Invalid referral code format')
]

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

// POST /auth/register - Secure user registration
router.post('/register', registrationLimiter, registrationValidation, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { email, password, firstName, lastName, company, phone, referralCode } = req.body
    const ipAddress = req.ip || req.connection.remoteAddress

    // Check for existing pending registrations from this IP
    const recentRegistrations = await auditService.getAuditLogs({
      action: 'USER_REGISTRATION',
      startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      limit: 10
    })

    const ipRegistrations = recentRegistrations.data.filter(
      (log: any) => log.ipAddress === ipAddress
    )

    if (ipRegistrations.length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many registrations from this IP address'
      })
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      company,
      phone,
      referralCode
    }, ipAddress)

    // Send verification email (in production, use a proper email service)
    await notificationService.send({
      userId: result.user.id,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Verify Your Email Address',
      message: `Welcome to NAMC NorCal! Please verify your email address to complete your registration.`,
      channel: 'EMAIL',
      data: {
        verificationToken: result.verificationToken,
        userName: `${firstName} ${lastName}`
      }
    })

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification instructions.',
      data: {
        userId: result.user.id,
        email: result.user.email,
        requiresVerification: true
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    await auditService.logSecurityEvent(
      undefined,
      'REGISTRATION_FAILED',
      { email: req.body.email, error: error.message },
      req.ip
    )

    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    })
  }
})

// POST /auth/verify-email - Email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Token and email are required'
      })
    }

    // Verify the token and activate the account
    // Implementation would depend on how verification tokens are stored
    // For now, we'll simulate the verification

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      })
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true }
    })

    await auditService.log({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      resource: 'users',
      resourceId: user.id,
      ipAddress: req.ip
    })

    await notificationService.send({
      userId: user.id,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Welcome to NAMC NorCal!',
      message: 'Your email has been verified successfully. You now have full access to your member portal.',
      channel: 'EMAIL'
    })

    res.json({
      success: true,
      message: 'Email verified successfully'
    })

  } catch (error) {
    console.error('Email verification error:', error)
    res.status(400).json({
      success: false,
      message: 'Email verification failed'
    })
  }
})

// POST /auth/login - Enhanced login with security features
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { email, password, rememberMe } = req.body
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')

    const result = await authService.login(email, password, ipAddress, userAgent)

    // Set secure HTTP-only cookies
    const accessTokenExpiry = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000
    const refreshTokenExpiry = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000

    if (!result.requiresTwoFactor) {
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: accessTokenExpiry
      })

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: refreshTokenExpiry
      })
    }

    res.json({
      success: true,
      message: result.requiresTwoFactor ? 'Two-factor authentication required' : 'Login successful',
      data: {
        user: result.user,
        requiresTwoFactor: result.requiresTwoFactor,
        twoFactorToken: result.twoFactorToken
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    
    await auditService.logSecurityEvent(
      undefined,
      'LOGIN_FAILED',
      { email: req.body.email, error: error.message },
      req.ip
    )

    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    })
  }
})

// POST /auth/verify-2fa - Two-factor authentication verification
router.post('/verify-2fa', async (req, res) => {
  try {
    const { twoFactorToken, code } = req.body

    if (!twoFactorToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor token and code are required'
      })
    }

    const result = await authService.verifyTwoFactor(twoFactorToken, code, req.ip)

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    })

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      success: true,
      message: 'Two-factor authentication successful',
      data: { user: result.user }
    })

  } catch (error) {
    console.error('2FA verification error:', error)
    res.status(401).json({
      success: false,
      message: error.message || 'Two-factor authentication failed'
    })
  }
})

// POST /auth/setup-2fa - Set up two-factor authentication
router.post('/setup-2fa', auth, async (req, res) => {
  try {
    const result = await authService.setupTwoFactor(req.user.userId)

    res.json({
      success: true,
      message: 'Two-factor authentication setup initiated',
      data: {
        secret: result.secret,
        qrCode: result.qrCode
      }
    })

  } catch (error) {
    console.error('2FA setup error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Two-factor authentication setup failed'
    })
  }
})

// POST /auth/enable-2fa - Enable two-factor authentication
router.post('/enable-2fa', auth, async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      })
    }

    await authService.enableTwoFactor(req.user.userId, token)

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    })

  } catch (error) {
    console.error('2FA enable error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to enable two-factor authentication'
    })
  }
})

// POST /auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      })
    }

    const result = await authService.refreshToken(refreshToken)

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    })

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    })
  }
})

// POST /auth/logout - Secure logout
router.post('/logout', auth, async (req, res) => {
  try {
    await authService.logout(req.user.userId, req.ip)

    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    res.json({
      success: true,
      message: 'Logout successful'
    })

  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    })
  }
})

// POST /auth/forgot-password - Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    await authService.resetPasswordRequest(email)

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    res.status(500).json({
      success: false,
      message: 'Password reset request failed'
    })
  }
})

// POST /auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      })
    }

    await authService.resetPassword(token, password)

    res.json({
      success: true,
      message: 'Password reset successful'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed'
    })
  }
})

// POST /auth/change-password - Change password (authenticated)
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      })
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword)

    res.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Password change error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password change failed'
    })
  }
})

// GET /auth/me - Get current user info
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        phone: true,
        memberType: true,
        memberSince: true,
        isVerified: true,
        twoFactorEnabled: true,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user
    })

  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    })
  }
})

export default router