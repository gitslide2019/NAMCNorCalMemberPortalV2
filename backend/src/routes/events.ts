import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const router = express.Router();
const prisma = new PrismaClient();

// Get all events
router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const { page = 1, limit = 10, upcoming = 'true' } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {
    isActive: true,
  };

  if (upcoming === 'true') {
    where.startDate = {
      gte: new Date(),
    };
  }

  const events = await prisma.event.findMany({
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
      registrations: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    skip,
    take: Number(limit),
    orderBy: { startDate: 'asc' },
  });

  const total = await prisma.event.count({ where });

  res.json({
    success: true,
    data: events,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Get event by ID
router.get('/:id', asyncHandler(async (req, res): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'Event ID is required' });
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
        },
      },
      registrations: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }

  res.json({
    success: true,
    data: event,
  });
}));

// Create event
router.post('/', [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('location').optional().trim(),
  body('isVirtual').optional().isBoolean(),
  body('meetingLink').optional().trim(),
  body('maxAttendees').optional().isInt({ min: 1 }),
], asyncHandler(async (req, res): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const userId = (req as any).user.id;
  const eventData = req.body;

  const event = await prisma.event.create({
    data: {
      ...eventData,
      createdBy: userId,
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
    data: event,
  });
}));

// Update event
router.put('/:id', [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('location').optional().trim(),
  body('isVirtual').optional().isBoolean(),
  body('meetingLink').optional().trim(),
  body('maxAttendees').optional().isInt({ min: 1 }),
  body('isActive').optional().isBoolean(),
], asyncHandler(async (req, res): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { id } = req.params;
  const updateData = req.body;

  const event = await prisma.event.update({
    where: { id },
    data: updateData,
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

  res.json({
    success: true,
    data: event,
  });
}));

// Register for event
router.post('/:id/register', asyncHandler(async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  if (!id) {
    res.status(400).json({ message: 'Event ID is required' });
    return;
  }

  // Check if event exists and is active
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    res.status(404).json({ message: 'Event not found' });
    return;
  }

  if (!event.isActive) {
    res.status(400).json({ message: 'Event is not active' });
    return;
  }

  // Check if user is already registered
  const existingRegistration = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: {
        eventId: id,
        userId,
      },
    },
  });

  if (existingRegistration) {
    res.status(400).json({ message: 'Already registered for this event' });
    return;
  }

  // Check if event is full
  if (event.maxAttendees) {
    const currentRegistrations = await prisma.eventRegistration.count({
      where: { eventId: id },
    });

    if (currentRegistrations >= event.maxAttendees) {
      res.status(400).json({ message: 'Event is full' });
      return;
    }
  }

  const registration = await prisma.eventRegistration.create({
    data: {
      eventId: id,
      userId,
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: registration,
  });
}));

// Cancel event registration
router.delete('/:id/register', asyncHandler(async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  if (!id) {
    res.status(400).json({ message: 'Event ID is required' });
    return;
  }

  const registration = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: {
        eventId: id,
        userId,
      },
    },
  });

  if (!registration) {
    res.status(404).json({ message: 'Registration not found' });
    return;
  }

  await prisma.eventRegistration.delete({
    where: {
      eventId_userId: {
        eventId: id,
        userId,
      },
    },
  });

  res.json({
    success: true,
    message: 'Registration cancelled successfully',
  });
}));

// Get user's event registrations
router.get('/user/registrations', asyncHandler(async (req, res): Promise<void> => {
  const userId = (req as any).user.id;

  const registrations = await prisma.eventRegistration.findMany({
    where: { userId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          location: true,
          isVirtual: true,
          meetingLink: true,
        },
      },
    },
    orderBy: { registeredAt: 'desc' },
  });

  res.json({
    success: true,
    data: registrations,
  });
}));

export default router; 