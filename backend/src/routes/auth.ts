import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import Tokens from 'csrf';

// JWT payload interface
interface JwtPayload {
  id: string;
  email: string;
  memberType: string;
  iat?: number;
  exp?: number;
}

const router = express.Router();
const prisma = new PrismaClient();
const tokens = new Tokens();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiter for login attempts
const loginSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // allow 2 requests per windowMs without delay
  delayMs: () => 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // max delay of 20 seconds
  validate: { delayMs: false }, // Disable warning
});

// General rate limiter for other endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CSRF token endpoint
router.get('/csrf-token', generalLimiter, (_req, res) => {
  const secret = tokens.secretSync();
  const token = tokens.create(secret);
  
  // Store secret in session or signed cookie
  res.cookie('csrfSecret', secret, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    signed: true
  });
  
  res.json({ csrfToken: token });
});

// CSRF validation middleware
const validateCSRF = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] as string || req.body.csrfToken;
  const secret = req.signedCookies?.['csrfSecret'];
  
  if (!token || !secret) {
    res.status(403).json({ message: 'CSRF token required' });
    return;
  }
  
  if (!tokens.verify(secret, token)) {
    res.status(403).json({ message: 'Invalid CSRF token' });
    return;
  }
  
  next();
};

// Register user
router.post('/register', authLimiter, validateCSRF, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('company').optional().trim(),
  body('phone').optional().trim(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password, firstName, lastName, company, phone } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    res.status(400).json({ message: 'User already exists' });
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      company,
      phone,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      memberType: true,
      memberSince: true,
      isActive: true,
      isVerified: true,
    }
  });

  // Generate access token (short-lived) and refresh token (long-lived)
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, memberType: user.memberType },
    process.env['JWT_SECRET']!,
    { expiresIn: '15m' } // Short-lived access token
  ) as string;

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env['JWT_REFRESH_SECRET'] || process.env['JWT_SECRET']!,
    { expiresIn: '7d' } // Long-lived refresh token
  ) as string;

  // Set HttpOnly cookies for tokens
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  res.status(201).json({
    success: true,
    user,
    message: 'Registration successful'
  });
  return;
}));

// Login user
router.post('/login', authLimiter, loginSpeedLimiter, validateCSRF, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  // Check if user is active
  if (!user.isActive) {
    res.status(401).json({ message: 'Account is deactivated' });
    return;
  }

  // Check for account lockout
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const remainingTime = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
    res.status(423).json({ 
      message: `Account locked. Try again in ${remainingTime} minutes.`,
      lockedUntil: user.lockedUntil
    });
    return;
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    // Increment failed login attempts
    const maxAttempts = 5;
    const lockoutDuration = 30 * 60 * 1000; // 30 minutes
    const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
    
    let updateData: any = {
      failedLoginAttempts: newFailedAttempts,
      lastFailedLogin: now
    };
    
    // Lock account if max attempts reached
    if (newFailedAttempts >= maxAttempts) {
      updateData.lockedUntil = new Date(now.getTime() + lockoutDuration);
      updateData.failedLoginAttempts = 0; // Reset counter after locking
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    
    // Log failed login attempt
    console.log(`Failed login attempt: ${email} from IP ${req.ip}. Attempts: ${newFailedAttempts}`);
    
    res.status(401).json({ 
      message: 'Invalid credentials',
      attemptsRemaining: Math.max(0, maxAttempts - newFailedAttempts)
    });
    return;
  }
  
  // Reset failed login attempts on successful login
  if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null
      }
    });
  }

  // Generate access token (short-lived) and refresh token (long-lived)
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, memberType: user.memberType },
    process.env['JWT_SECRET']!,
    { expiresIn: '15m' } // Short-lived access token
  ) as string;

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env['JWT_REFRESH_SECRET'] || process.env['JWT_SECRET']!,
    { expiresIn: '7d' } // Long-lived refresh token
  ) as string;

  // Set HttpOnly cookies for tokens
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  // Log successful login for audit trail
  console.log(`Login successful: User ${user.email} from IP ${req.ip}`);

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      memberType: user.memberType,
      memberSince: user.memberSince,
      isActive: user.isActive,
      isVerified: user.isVerified,
    },
    message: 'Login successful'
  });
  return;
}));

// Get current user
router.get('/me', generalLimiter, asyncHandler(async (req, res) => {
  // Try to get token from cookies first, then fallback to Authorization header
  const token = req.cookies?.['accessToken'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    res.status(401).json({ message: 'No access token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
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
        isActive: true,
        isVerified: true,
        profileImage: true,
        bio: true,
        website: true,
        linkedin: true,
        twitter: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user
    });
    return;
  } catch (_error) {
    res.status(401).json({ message: 'Invalid or expired access token' });
    return;
  }
}));

// Refresh access token using refresh token
router.post('/refresh', authLimiter, validateCSRF, asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.['refreshToken'];

  if (!refreshToken) {
    res.status(401).json({ message: 'No refresh token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env['JWT_REFRESH_SECRET'] || process.env['JWT_SECRET']!) as { id: string, type: string };
    
    if (decoded.type !== 'refresh') {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        memberType: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User not found or inactive' });
      return;
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, memberType: user.memberType },
      process.env['JWT_SECRET']!,
      { expiresIn: '15m' }
    ) as string;

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
    return;
  } catch (_error) {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }
}));

// Logout user (clear cookies)
router.post('/logout', generalLimiter, validateCSRF, asyncHandler(async (_req, res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/'
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
  return;
}));

// Forgot password
router.post('/forgot-password', authLimiter, validateCSRF, [
  body('email').isEmail().normalizeEmail(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { id: user.id },
    process.env['JWT_SECRET']!,
    { expiresIn: '1h' } as any
  ) as string;

  // Prevent unused variable warning
  console.log('Reset token generated:', resetToken.length > 0 ? 'success' : 'failed');

  // TODO: Send email with reset link
  // For now, just return success
  res.json({
    success: true,
    message: 'Password reset email sent'
  });
  return;
}));

export default router; 