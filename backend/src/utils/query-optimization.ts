// Query optimization utilities to prevent N+1 queries and improve performance
// This file addresses performance issues identified in the security audit

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bulk notification helper to prevent N+1 queries
export async function sendBulkNotifications(
  userIds: string[],
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
    channel?: string;
  }
) {
  if (userIds.length === 0) return;

  // Create notifications in batches to avoid overwhelming the database
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    batches.push(userIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const notificationData = batch.map(userId => ({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      channel: notification.channel || 'IN_APP',
      isRead: false,
      createdAt: new Date()
    }));

    await prisma.notification.createMany({
      data: notificationData,
      skipDuplicates: true
    });
  }
}

// Optimized user permissions query with caching considerations
export async function getUserWithPermissions(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      memberType: true,
      isActive: true,
      isVerified: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      resource: true,
                      action: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
}

// Optimized event query with pagination for registrations
export async function getEventWithRegistrations(
  eventId: string,
  registrationPage: number = 1,
  registrationLimit: number = 50
) {
  const skip = (registrationPage - 1) * registrationLimit;

  const [event, registrationCount] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        },
        registrations: {
          skip,
          take: registrationLimit,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true
              }
            }
          },
          orderBy: { registeredAt: 'desc' }
        }
      }
    }),
    prisma.eventRegistration.count({
      where: { eventId }
    })
  ]);

  return {
    ...event,
    registrationCount,
    registrationPages: Math.ceil(registrationCount / registrationLimit)
  };
}

// Optimized paginated queries helper
export function createPaginatedQuery<T>(
  baseQuery: T,
  page: number = 1,
  limit: number = 20,
  maxLimit: number = 100
): { query: T & { skip: number; take: number }, pagination: any } {
  const safeLimit = Math.min(Math.max(1, limit), maxLimit);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;

  return {
    query: {
      ...baseQuery,
      skip,
      take: safeLimit
    },
    pagination: {
      page: safePage,
      limit: safeLimit,
      skip
    }
  };
}

// Optimized user registrations with pagination
export async function getUserRegistrationsPaginated(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const { query, pagination } = createPaginatedQuery(
    { where: { userId } },
    page,
    limit
  );

  const [registrations, total] = await Promise.all([
    prisma.eventRegistration.findMany({
      ...query,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true,
            isVirtual: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    }),
    prisma.eventRegistration.count({ where: { userId } })
  ]);

  return {
    data: registrations,
    pagination: {
      ...pagination,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  };
}

// Optimized search with proper indexing hints
export async function searchUsers(
  searchTerm: string,
  filters: {
    memberType?: string;
    isActive?: boolean;
    city?: string;
  } = {},
  page: number = 1,
  limit: number = 20
) {
  const { query, pagination } = createPaginatedQuery({}, page, limit);

  const where: any = {
    isActive: filters.isActive ?? true,
    ...(filters.memberType && { memberType: filters.memberType }),
    ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' } })
  };

  if (searchTerm) {
    where.OR = [
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { company: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

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
        city: true,
        state: true,
        isActive: true,
        memberSince: true
      },
      ...query,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    }),
    prisma.user.count({ where })
  ]);

  return {
    data: users,
    pagination: {
      ...pagination,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  };
}

// Batch operations helper
export async function batchUpdateUsers(
  userIds: string[],
  updateData: any,
  batchSize: number = 100
) {
  const batches = [];
  for (let i = 0; i < userIds.length; i += batchSize) {
    batches.push(userIds.slice(i, i + batchSize));
  }

  const results = [];
  for (const batch of batches) {
    const result = await prisma.user.updateMany({
      where: { id: { in: batch } },
      data: updateData
    });
    results.push(result);
  }

  return results;
}

// Cache-friendly permission lookup
export function formatUserPermissions(user: any): {
  roles: string[];
  permissions: string[];
} {
  const roles = user.roles?.map((ur: any) => ur.role.name) || [];
  const permissions = new Set<string>();

  user.roles?.forEach((userRole: any) => {
    userRole.role.permissions?.forEach((rp: any) => {
      permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
    });
  });

  return {
    roles,
    permissions: Array.from(permissions)
  };
}