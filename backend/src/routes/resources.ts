import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const router = express.Router();
const prisma = new PrismaClient();

// Get all resources
router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const { page = 1, limit = 20, category } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = { isPublic: true };

  if (category) {
    where.category = category;
  }

  const resources = await prisma.resource.findMany({
    where,
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

  const total = await prisma.resource.count({ where });

  res.json({
    success: true,
    data: resources,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Upload resource
router.post('/', [
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('fileUrl').trim().notEmpty(),
  body('fileType').trim().notEmpty(),
  body('fileSize').isInt({ min: 1 }),
  body('category').optional().trim(),
  body('isPublic').optional().isBoolean(),
], asyncHandler(async (req, res): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const creatorId = (req as any).user.id;
  const resourceData = req.body;

  const resource = await prisma.resource.create({
    data: {
      ...resourceData,
      createdBy: creatorId,
    },
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
  });

  res.status(201).json({
    success: true,
    data: resource,
  });
}));

export default router; 