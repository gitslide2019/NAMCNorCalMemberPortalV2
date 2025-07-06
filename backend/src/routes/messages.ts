import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's messages (inbox)
router.get('/inbox', asyncHandler(async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const { page = 1, limit = 20 } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);

  const messages = await prisma.message.findMany({
    where: { receiverId: userId },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          profileImage: true,
        },
      },
    },
    skip,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
  });

  const total = await prisma.message.count({
    where: { receiverId: userId },
  });

  res.json({
    success: true,
    data: messages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Get sent messages
router.get('/sent', asyncHandler(async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const { page = 1, limit = 20 } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);

  const messages = await prisma.message.findMany({
    where: { senderId: userId },
    include: {
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          profileImage: true,
        },
      },
    },
    skip,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
  });

  const total = await prisma.message.count({
    where: { senderId: userId },
  });

  res.json({
    success: true,
    data: messages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Send message
router.post('/', [
  body('receiverId').notEmpty(),
  body('subject').trim().notEmpty(),
  body('content').trim().notEmpty(),
], asyncHandler(async (req, res): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const senderId = (req as any).user.id;
  const { receiverId, subject, content } = req.body;

  // Check if receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
  });

  if (!receiver) {
    res.status(404).json({ message: 'Receiver not found' });
    return;
  }

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      subject,
      content,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
        },
      },
      receiver: {
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
    data: message,
  });
}));

// Get message by ID
router.get('/:id', asyncHandler(async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  if (!id) {
    res.status(400).json({ message: 'Message ID is required' });
    return;
  }

  const message = await prisma.message.findFirst({
    where: {
      id,
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          profileImage: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          profileImage: true,
        },
      },
    },
  });

  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return;
  }

  // Mark as read if user is receiver
  if (message.receiverId === userId && !message.isRead) {
    await prisma.message.update({
      where: { id },
      data: { isRead: true },
    });
  }

  res.json({
    success: true,
    data: message,
  });
}));

// Mark message as read
router.patch('/:id/read', asyncHandler(async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  if (!id) {
    res.status(400).json({ message: 'Message ID is required' });
    return;
  }

  const message = await prisma.message.findFirst({
    where: {
      id,
      receiverId: userId,
    },
  });

  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return;
  }

  await prisma.message.update({
    where: { id },
    data: { isRead: true },
  });

  res.json({
    success: true,
    message: 'Message marked as read',
  });
}));

// Delete message
router.delete('/:id', asyncHandler(async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  if (!id) {
    res.status(400).json({ message: 'Message ID is required' });
    return;
  }

  const message = await prisma.message.findFirst({
    where: {
      id,
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
  });

  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return;
  }

  await prisma.message.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Message deleted successfully',
  });
}));

export default router; 