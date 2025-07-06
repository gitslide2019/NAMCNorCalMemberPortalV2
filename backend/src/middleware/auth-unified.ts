// Unified Authentication and Authorization Middleware with Proper RBAC

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import rateLimit from 'express-rate-limit'

const prisma = new PrismaClient()

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email: string
    roles: string[]
    permissions: string[]
    memberType: string
    isActive: boolean
    isVerified: boolean
  }
}

// Enhanced authentication middleware with proper security checks
export const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Try to get token from cookie first, then Authorization header
    let token = req.cookies?.accessToken
    
    if (!token) {
      const authHeader = req.header('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
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
        return res.status(401).json({
          success: false,
          message: 'Access denied. User not found or inactive.'
        })
      }

      // Check if user is verified for sensitive operations
      if (!user.isVerified && req.path.includes('/admin')) {
        return res.status(403).json({
          success: false,
          message: 'Email verification required for admin access.'
        })
      }

      // Extract roles and permissions
      const roles = user.roles.map(ur => ur.role.name)
      const permissions = new Set<string>()
      
      user.roles.forEach(userRole => {
        userRole.role.permissions.forEach(rp => {
          permissions.add(`${rp.permission.resource}:${rp.permission.action}`)
        })
      })

      req.user = {
        userId: user.id,
        email: user.email,
        roles,
        permissions: Array.from(permissions),
        memberType: user.memberType,
        isActive: user.isActive,
        isVerified: user.isVerified
      }

      next()

    } catch (jwtError: any) {
      // Try to refresh token if it's expired
      if (jwtError.name === 'TokenExpiredError') {
        const refreshToken = req.cookies?.refreshToken
        
        if (refreshToken) {
          try {
            const refreshDecoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any
            
            const user = await prisma.user.findUnique({
              where: { id: refreshDecoded.userId },
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

            if (user && user.isActive) {
              // Generate new tokens
              const newAccessToken = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET!,
                { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
              )

              const newRefreshToken = jwt.sign(
                { userId: user.id, type: 'refresh' },
                process.env.JWT_REFRESH_SECRET!,
                { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
              )

              // Set new cookies
              res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
              })

              res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
              })

              // Extract roles and permissions
              const roles = user.roles.map(ur => ur.role.name)
              const permissions = new Set<string>()
              
              user.roles.forEach(userRole => {
                userRole.role.permissions.forEach(rp => {
                  permissions.add(`${rp.permission.resource}:${rp.permission.action}`)
                })
              })

              req.user = {
                userId: user.id,
                email: user.email,
                roles,
                permissions: Array.from(permissions),
                memberType: user.memberType,
                isActive: user.isActive,
                isVerified: user.isVerified
              }

              return next()
            }
          } catch (refreshError) {
            // Refresh token is also invalid
          }
        }
      }

      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      })
    }

  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

// Role-based authorization middleware
export const requireRole = (requiredRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
    const hasRole = roles.some(role => req.user!.roles.includes(role))

    if (!hasRole) {
      // Log unauthorized access attempt
      logSecurityEvent(req.user.userId, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
        requiredRoles: roles,
        userRoles: req.user.roles,
        endpoint: req.originalUrl
      }, req.ip)

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required roles: ' + roles.join(', ')
      })
    }

    next()
  }
}

// Permission-based authorization middleware
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    const requiredPermission = `${resource}:${action}`
    const hasPermission = req.user.permissions.includes(requiredPermission)

    if (!hasPermission) {
      // Log unauthorized access attempt
      logSecurityEvent(req.user.userId, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
        requiredPermission,
        userPermissions: req.user.permissions,
        endpoint: req.originalUrl
      }, req.ip)

      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${requiredPermission}`
      })
    }

    next()
  }
}

// Admin authorization (unified approach)
export const requireAdmin = requireRole(['ADMIN', 'SUPER_ADMIN'])

// Owner or admin authorization
export const requireOwnerOrAdmin = (resourceIdParam: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    const resourceId = req.params[resourceIdParam]
    const isAdmin = req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')
    
    // If user is admin, allow access
    if (isAdmin) {
      return next()
    }

    // Check if user owns the resource
    const isOwner = resourceId === req.user.userId

    if (!isOwner) {
      logSecurityEvent(req.user.userId, 'UNAUTHORIZED_RESOURCE_ACCESS', {
        resourceId,
        endpoint: req.originalUrl
      }, req.ip)

      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      })
    }

    next()
  }
}

// Membership tier authorization
export const requireMembershipTier = (requiredTiers: string | string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { memberType: true, membershipExpiresAt: true }
      })

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        })
      }

      // Check if membership is expired
      if (user.membershipExpiresAt && user.membershipExpiresAt < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Membership expired. Please renew to access this feature.'
        })
      }

      const tiers = Array.isArray(requiredTiers) ? requiredTiers : [requiredTiers]
      const hasTier = tiers.includes(user.memberType)

      if (!hasTier) {
        return res.status(403).json({
          success: false,
          message: `Premium membership required. Required tiers: ${tiers.join(', ')}`
        })
      }

      next()

    } catch (error) {
      console.error('Membership tier check error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }
}

// Audit logging middleware for sensitive operations
export const auditLog = (action: string, resource: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send

    res.send = function(body) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          const success = res.statusCode >= 200 && res.statusCode < 300
          
          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId,
              action: success ? action : `${action}_FAILED`,
              resource,
              resourceId: req.params.id,
              oldData: req.method === 'PUT' || req.method === 'PATCH' ? req.body.oldData : undefined,
              newData: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? req.body : undefined,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          })
        } catch (error) {
          console.error('Audit logging error:', error)
        }
      })

      return originalSend.call(this, body)
    }

    next()
  }
}

// Rate limiting by user
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>()

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next() // Let auth middleware handle this
    }

    const now = Date.now()
    const userId = req.user.userId
    const userRequest = userRequests.get(userId)

    if (!userRequest || now > userRequest.resetTime) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (userRequest.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      })
    }

    userRequest.count++
    next()
  }
}

// Email verification requirement
export const requireEmailVerification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    })
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required. Please verify your email address.'
    })
  }

  next()
}

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.stripe.com; " +
      "frame-src https://js.stripe.com;"
    )
  }
  
  next()
}

// Input validation rate limiting for brute force protection
export const bruteForceProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many failed attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Helper function to log security events
async function logSecurityEvent(userId: string | undefined, event: string, details: any, ipAddress?: string): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: `SECURITY_${event}`,
        resource: 'security',
        newData: details,
        ipAddress
      }
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

export { AuthenticatedRequest }