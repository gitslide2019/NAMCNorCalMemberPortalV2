// Security utilities to complete missing security implementations
// This addresses security gaps identified in the audit

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// File upload validation and security
export interface FileUploadConfig {
  maxSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  sanitizeFileName: boolean;
}

export const DEFAULT_FILE_CONFIG: FileUploadConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'],
  sanitizeFileName: true
};

export function validateFileUpload(
  file: Express.Multer.File,
  config: FileUploadConfig = DEFAULT_FILE_CONFIG
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file size
  if (file.size > config.maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${config.maxSize} bytes`);
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} not allowed`);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!config.allowedExtensions.includes(ext)) {
    errors.push(`File extension ${ext} not allowed`);
  }

  // Check for suspicious file content (basic check)
  if (file.buffer) {
    const fileHeader = file.buffer.toString('hex', 0, 10);
    
    // Check for common malicious patterns
    const suspiciousPatterns = [
      '504b0304', // ZIP file header (could be disguised executable)
      '4d5a',     // PE executable header
      '7f454c46', // ELF executable header
    ];

    // Only flag as suspicious if MIME type doesn't match content
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      if (suspiciousPatterns.some(pattern => fileHeader.startsWith(pattern))) {
        errors.push('File content does not match declared type');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function sanitizeFileName(fileName: string): string {
  // Remove or replace dangerous characters
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\./, '_') // Don't allow files starting with dot
    .substring(0, 255); // Limit length
}

export function generateSecureFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  
  return `${timestamp}_${random}${ext}`;
}

// Password reset token generation and validation
export function generatePasswordResetToken(): {
  token: string;
  hashedToken: string;
  expires: Date;
} {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  return { token, hashedToken, expires };
}

export function generateEmailVerificationToken(): {
  token: string;
  hashedToken: string;
  expires: Date;
} {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return { token, hashedToken, expires };
}

export async function createPasswordResetRequest(
  email: string
): Promise<{ success: boolean; message: string; token?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, isActive: true }
    });

    if (!user || !user.isActive) {
      // Don't reveal if user exists for security
      return { success: true, message: 'If an account exists, reset instructions have been sent.' };
    }

    const { token, hashedToken, expires } = generatePasswordResetToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires
      }
    });

    // Log security event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'security',
        newData: { email },
        ipAddress: null // This should be passed from request
      }
    });

    return {
      success: true,
      message: 'If an account exists, reset instructions have been sent.',
      token // Return token for email sending (not to client)
    };

  } catch (error) {
    console.error('Password reset request error:', error);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

export async function validatePasswordResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; message: string }> {
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
        isActive: true
      },
      select: { id: true }
    });

    if (!user) {
      return { valid: false, message: 'Invalid or expired reset token' };
    }

    return { valid: true, userId: user.id, message: 'Token is valid' };

  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, message: 'Token validation failed' };
  }
}

// Input sanitization utilities
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, ''); // Remove angle brackets
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  const isReasonableLength = email.length <= 254; // RFC 5321 limit
  
  return isValid && isReasonableLength;
}

export function validatePhoneNumber(phone: string): boolean {
  // US phone number validation
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Rate limiting helpers
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class InMemoryRateLimit {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(maxRequests: number, windowMs: number, blockDurationMs: number = windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  isBlocked(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const now = Date.now();
    
    // Check if block has expired
    if (entry.blocked && now > entry.resetTime) {
      this.store.delete(key);
      return false;
    }

    return entry.blocked;
  }

  increment(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs,
        blocked: false
      };
      this.store.set(key, newEntry);
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Increment existing entry
    entry.count++;

    if (entry.count > this.maxRequests) {
      entry.blocked = true;
      entry.resetTime = now + this.blockDurationMs;
    }

    this.store.set(key, entry);

    return {
      allowed: entry.count <= this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime
    };
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime && !entry.blocked) {
        this.store.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters for different use cases
export const loginRateLimit = new InMemoryRateLimit(5, 15 * 60 * 1000, 30 * 60 * 1000); // 5 attempts per 15 min, block for 30 min
export const apiRateLimit = new InMemoryRateLimit(100, 15 * 60 * 1000); // 100 requests per 15 min
export const emailRateLimit = new InMemoryRateLimit(3, 60 * 60 * 1000); // 3 emails per hour

// Security headers helper
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': process.env.NODE_ENV === 'production' 
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:;",
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    })
  };
}

// Cleanup function to run periodically
export function runSecurityCleanup(): void {
  // Cleanup rate limiters
  loginRateLimit.cleanup();
  apiRateLimit.cleanup();
  emailRateLimit.cleanup();

  // Log cleanup completion
  console.log('Security cleanup completed at', new Date().toISOString());
}

// Set up periodic cleanup (run every hour)
if (process.env.NODE_ENV !== 'test') {
  setInterval(runSecurityCleanup, 60 * 60 * 1000); // 1 hour
}