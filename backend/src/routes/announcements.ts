import express from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const router = express.Router();
const prisma = new PrismaClient();

// Get all announcements
router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const { page = 1, limit = 10 } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);

  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
        },
      },
    },
    skip,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
  });

  const total = await prisma.announcement.count({
    where: { isActive: true },
  });

  res.json({
    success: true,
    data: announcements,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

export default router; 