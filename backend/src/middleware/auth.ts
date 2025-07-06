import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    memberType: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Try to get token from cookies first, then fallback to Authorization header
  const token = req.cookies?.['accessToken'] || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      memberType: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Check if user is admin (you can modify this logic based on your admin criteria)
  if (req.user.memberType !== 'LIFETIME' && req.user.memberType !== 'HONORARY') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
}; 