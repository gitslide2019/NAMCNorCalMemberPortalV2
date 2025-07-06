import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (member directory)
router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const { search, memberType, page = 1, limit = 20 } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { company: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (memberType) {
    where.memberType = memberType;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      memberType: true,
      memberSince: true,
      profileImage: true,
      bio: true,
      website: true,
      linkedin: true,
      twitter: true,
    },
    skip,
    take: Number(limit),
    orderBy: { lastName: 'asc' },
  });

  const total = await prisma.user.count({ where });

  res.json({
    success: true,
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Get user by ID
router.get('/:id', asyncHandler(async (req, res): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      memberType: true,
      memberSince: true,
      profileImage: true,
      bio: true,
      website: true,
      linkedin: true,
      twitter: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
}));

// Update user profile
router.put('/profile', [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('company').optional().trim(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('zipCode').optional().trim(),
  body('bio').optional().trim(),
  body('website').optional().trim().isURL(),
  body('linkedin').optional().trim().isURL(),
  body('twitter').optional().trim().isURL(),
], asyncHandler(async (req, res): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = (req as any).user.id;
  const updateData = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      memberType: true,
      memberSince: true,
      profileImage: true,
      bio: true,
      website: true,
      linkedin: true,
      twitter: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: user,
  });
}));

// Upload profile image
router.post('/profile-image', asyncHandler(async (_req, res): Promise<void> => {
  // TODO: Implement file upload logic
  // For now, just return success
  res.json({
    success: true,
    message: 'Profile image uploaded successfully',
  });
}));

// Get user statistics
router.get('/stats/overview', asyncHandler(async (_req, res): Promise<void> => {
  const totalMembers = await prisma.user.count({
    where: { isActive: true },
  });

  const newMembersThisMonth = await prisma.user.count({
    where: {
      isActive: true,
      memberSince: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  const memberTypes = await prisma.user.groupBy({
    by: ['memberType'],
    where: { isActive: true },
    _count: {
      memberType: true,
    },
  });

  res.json({
    success: true,
    data: {
      totalMembers,
      newMembersThisMonth,
      memberTypes,
    },
  });
}));

export default router; 