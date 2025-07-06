import express from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import { auth, requireRole, requirePermission, auditLog } from '../middleware/auth-unified';
import { body, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many admin requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication and admin role requirement to ALL admin routes
router.use(auth);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));
router.use(adminRateLimit);

// Input validation
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ max: 100 }).trim().escape(),
];

const userManagementValidation = [
  body('memberType').optional().isIn(['REGULAR', 'PREMIUM', 'LIFETIME', 'HONORARY', 'ADMIN']),
  body('isActive').optional().isBoolean(),
];

// Get admin dashboard stats
router.get('/dashboard', 
  requirePermission('admin', 'read'),
  auditLog('ADMIN_DASHBOARD_VIEW', 'admin'),
  asyncHandler(async (req, res): Promise<void> => {
    const [
      totalMembers,
      totalEvents,
      totalResources,
      recentRegistrations,
      membersByType,
      eventsByMonth,
      systemHealth
    ] = await Promise.all([
      // Total active members
      prisma.user.count({
        where: { isActive: true }
      }),

      // Total active events
      prisma.event.count({
        where: { isActive: true }
      }),

      // Total public resources
      prisma.resource.count({
        where: { isPublic: true }
      }),

      // Recent registrations (last 30 days)
      prisma.user.count({
        where: {
          isActive: true,
          memberSince: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Members by type
      prisma.user.groupBy({
        by: ['memberType'],
        _count: { memberType: true },
        where: { isActive: true }
      }),

      // Events by month (last 6 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM events 
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `,

      // System health metrics
      {
        database: 'connected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalMembers,
          totalEvents,
          totalResources,
          recentRegistrations
        },
        analytics: {
          membersByType: membersByType.map(item => ({
            type: item.memberType,
            count: item._count.memberType
          })),
          eventsByMonth
        },
        systemHealth
      }
    });
  })
);

// Get all users (admin view) with enhanced filtering and security
router.get('/users', 
  paginationValidation,
  requirePermission('users', 'read'),
  auditLog('ADMIN_USERS_LIST', 'users'),
  asyncHandler(async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { 
      page = 1, 
      limit = 20, 
      search, 
      memberType, 
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (Number(page) - 1) * Math.min(Number(limit), 100);
    const take = Math.min(Number(limit), 100);
    
    const where: any = {};

    // Search functionality
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filters
    if (memberType) {
      where.memberType = memberType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Sorting
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          memberType: true,
          memberSince: true,
          membershipExpiresAt: true,
          isActive: true,
          isVerified: true,
          failedLoginAttempts: true,
          lastSuccessfulLogin: true,
          createdAt: true,
          roles: {
            include: {
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        skip,
        take,
        orderBy
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users.map(user => ({
        ...user,
        roles: user.roles.map(ur => ur.role.name)
      })),
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  })
);

// Update user (admin action)
router.put('/users/:userId',
  userManagementValidation,
  requirePermission('users', 'update'),
  auditLog('ADMIN_USER_UPDATE', 'users'),
  asyncHandler(async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { userId } = req.params;
    const { memberType, isActive, membershipExpiresAt } = req.body;

    // Get current user data for audit trail
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        memberType: true,
        isActive: true,
        membershipExpiresAt: true
      }
    });

    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Prevent admin from deactivating themselves
    if (userId === (req as any).user.userId && isActive === false) {
      res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(memberType && { memberType }),
        ...(isActive !== undefined && { isActive }),
        ...(membershipExpiresAt && { membershipExpiresAt: new Date(membershipExpiresAt) }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        memberType: true,
        isActive: true,
        membershipExpiresAt: true
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  })
);

// System health check
router.get('/health',
  requirePermission('admin', 'read'),
  asyncHandler(async (req, res): Promise<void> => {
    const dbHealth = await prisma.$queryRaw`SELECT 1 as healthy`;
    
    res.json({
      success: true,
      data: {
        database: Array.isArray(dbHealth) && dbHealth.length > 0 ? 'healthy' : 'unhealthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  })
);

export default router; 