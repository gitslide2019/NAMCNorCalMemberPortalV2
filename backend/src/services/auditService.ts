// Comprehensive Audit Trail System for tracking sensitive operations

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  oldData?: any
  newData?: any
  ipAddress?: string
  userAgent?: string
  metadata?: any
}

interface AuditQuery {
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export class AuditService {
  private sensitiveFields = new Set([
    'password',
    'twoFactorSecret',
    'resetToken',
    'socialSecurityNumber',
    'bankAccount',
    'creditCard'
  ])

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitize sensitive data
      const sanitizedOldData = this.sanitizeData(entry.oldData)
      const sanitizedNewData = this.sanitizeData(entry.newData)

      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          oldData: sanitizedOldData,
          newData: sanitizedNewData,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: new Date()
        }
      })

      // For critical actions, also log to external system
      if (this.isCriticalAction(entry.action)) {
        await this.logToCriticalAuditSystem(entry)
      }

    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Don't throw - audit logging should never break the main operation
    }
  }

  async logMultiple(entries: AuditLogEntry[]): Promise<void> {
    const sanitizedEntries = entries.map(entry => ({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      oldData: this.sanitizeData(entry.oldData),
      newData: this.sanitizeData(entry.newData),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      timestamp: new Date()
    }))

    try {
      await prisma.auditLog.createMany({
        data: sanitizedEntries
      })
    } catch (error) {
      console.error('Failed to create multiple audit logs:', error)
    }
  }

  async getAuditLogs(query: AuditQuery): Promise<any> {
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = query

    const skip = (page - 1) * limit
    const where: any = {}

    if (userId) where.userId = userId
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (resource) where.resource = resource
    if (resourceId) where.resourceId = resourceId
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getUserActivity(userId: string, options: {
    days?: number
    page?: number
    limit?: number
  } = {}): Promise<any> {
    const { days = 30, page = 1, limit = 20 } = options
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.getAuditLogs({
      userId,
      startDate,
      page,
      limit
    })
  }

  async getResourceHistory(resource: string, resourceId: string): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: {
        resource,
        resourceId
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    })
  }

  async getCriticalEvents(days: number = 7): Promise<any[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const criticalActions = [
      'USER_DELETED',
      'USER_SUSPENDED',
      'ADMIN_ACCESS_GRANTED',
      'ADMIN_ACCESS_REVOKED',
      'PAYMENT_REFUNDED',
      'DATA_EXPORT',
      'BULK_DELETE',
      'SECURITY_BREACH',
      'PASSWORD_RESET_ADMIN'
    ]

    return await prisma.auditLog.findMany({
      where: {
        action: { in: criticalActions },
        timestamp: { gte: startDate }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    })
  }

  async getAuditStatistics(days: number = 30): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [
      totalLogs,
      uniqueUsers,
      actionStats,
      resourceStats
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { timestamp: { gte: startDate } }
      }),
      prisma.auditLog.findMany({
        where: { timestamp: { gte: startDate } },
        select: { userId: true },
        distinct: ['userId']
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: startDate } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),
      prisma.auditLog.groupBy({
        by: ['resource'],
        where: { timestamp: { gte: startDate } },
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } },
        take: 10
      })
    ])

    return {
      totalLogs,
      uniqueUsers: uniqueUsers.length,
      topActions: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count.action
      })),
      topResources: resourceStats.map(stat => ({
        resource: stat.resource,
        count: stat._count.resource
      }))
    }
  }

  async exportAuditLogs(query: AuditQuery, format: 'csv' | 'json' = 'csv'): Promise<string> {
    const logs = await this.getAuditLogs({ ...query, limit: 10000 })
    
    if (format === 'json') {
      return JSON.stringify(logs.data, null, 2)
    }

    // CSV format
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Resource',
      'Resource ID',
      'IP Address'
    ]

    const rows = logs.data.map((log: any) => [
      log.timestamp.toISOString(),
      log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System',
      log.action,
      log.resource,
      log.resourceId || '',
      log.ipAddress || ''
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  // Specific audit methods for common operations
  async logUserLogin(userId: string, ipAddress?: string, userAgent?: string, success: boolean = true): Promise<void> {
    await this.log({
      userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      resource: 'users',
      resourceId: userId,
      ipAddress,
      userAgent
    })
  }

  async logUserLogout(userId: string, ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      action: 'LOGOUT',
      resource: 'users',
      resourceId: userId,
      ipAddress
    })
  }

  async logPasswordChange(userId: string, adminUserId?: string): Promise<void> {
    await this.log({
      userId: adminUserId || userId,
      action: adminUserId ? 'PASSWORD_RESET_ADMIN' : 'PASSWORD_CHANGED',
      resource: 'users',
      resourceId: userId,
      metadata: adminUserId ? { targetUserId: userId } : undefined
    })
  }

  async logDataAccess(userId: string, resource: string, resourceId: string, action: string = 'READ'): Promise<void> {
    await this.log({
      userId,
      action: `DATA_${action.toUpperCase()}`,
      resource,
      resourceId
    })
  }

  async logPaymentEvent(userId: string, paymentId: string, action: string, amount?: number): Promise<void> {
    await this.log({
      userId,
      action: `PAYMENT_${action.toUpperCase()}`,
      resource: 'payments',
      resourceId: paymentId,
      metadata: { amount }
    })
  }

  async logAdminAction(adminUserId: string, action: string, targetResource: string, targetId: string, details?: any): Promise<void> {
    await this.log({
      userId: adminUserId,
      action: `ADMIN_${action.toUpperCase()}`,
      resource: targetResource,
      resourceId: targetId,
      metadata: details
    })
  }

  async logSecurityEvent(userId: string | undefined, event: string, details: any, ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      action: `SECURITY_${event.toUpperCase()}`,
      resource: 'security',
      metadata: details,
      ipAddress
    })
  }

  async logDataExport(userId: string, exportType: string, recordCount: number): Promise<void> {
    await this.log({
      userId,
      action: 'DATA_EXPORT',
      resource: 'data',
      metadata: {
        exportType,
        recordCount
      }
    })
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }

    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'USER_DELETED',
      'ADMIN_ACCESS_GRANTED',
      'ADMIN_ACCESS_REVOKED',
      'PAYMENT_REFUNDED',
      'DATA_EXPORT',
      'SECURITY_BREACH',
      'BULK_DELETE'
    ]

    return criticalActions.includes(action)
  }

  private async logToCriticalAuditSystem(entry: AuditLogEntry): Promise<void> {
    // In production, this would log to an external audit system
    // like AWS CloudTrail, Splunk, or similar
    console.log('CRITICAL AUDIT EVENT:', {
      timestamp: new Date().toISOString(),
      ...entry
    })
  }

  // Cleanup old audit logs (run periodically)
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    })

    console.log(`Cleaned up ${result.count} audit logs older than ${retentionDays} days`)
    return result.count
  }

  // Detect suspicious patterns
  async detectSuspiciousActivity(): Promise<any[]> {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Look for patterns that might indicate suspicious activity
    const [
      multipleFailedLogins,
      unusualDataAccess,
      offHoursActivity
    ] = await Promise.all([
      // Multiple failed logins from same IP
      prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: {
          action: 'LOGIN_FAILED',
          timestamp: { gte: oneDayAgo }
        },
        _count: { ipAddress: true },
        having: {
          ipAddress: { _count: { gt: 10 } }
        }
      }),
      
      // Unusual data access patterns
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          action: { startsWith: 'DATA_' },
          timestamp: { gte: oneDayAgo }
        },
        _count: { userId: true },
        having: {
          userId: { _count: { gt: 100 } }
        }
      }),

      // Activity during unusual hours (outside 6 AM - 10 PM)
      prisma.$queryRaw`
        SELECT userId, COUNT(*) as activity_count
        FROM audit_logs 
        WHERE timestamp >= ${oneDayAgo}
          AND (EXTRACT(hour FROM timestamp) < 6 OR EXTRACT(hour FROM timestamp) > 22)
        GROUP BY userId
        HAVING COUNT(*) > 20
      `
    ])

    return {
      multipleFailedLogins,
      unusualDataAccess,
      offHoursActivity
    }
  }
}

export const auditService = new AuditService()