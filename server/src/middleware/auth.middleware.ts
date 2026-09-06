import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'mpals-sih2026-secure-jwt-signing-secret-key-32chars';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'Ministry' | 'State' | 'District' | 'MP';
  scope_id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Enforce valid JWT token on protected endpoints
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required: Missing Bearer token'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired authorization token'
    });
  }
}

/**
 * Optional authentication: attaches user if valid token provided, otherwise proceeds as public/guest
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    } catch {
      // Allow unauthenticated guest access
    }
  }
  next();
}

/**
 * Role-based access control guard
 */
export function requireRole(allowedRoles: Array<'Ministry' | 'State' | 'District' | 'MP'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' lacks sufficient privileges. Required: [${allowedRoles.join(', ')}]`
      });
      return;
    }

    next();
  };
}
