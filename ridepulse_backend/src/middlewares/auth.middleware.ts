import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size?: number;
  };
}

export const authenticateJwt = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token missing or invalid format' }
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string };
    req.user = decoded;
    next();
  } catch (_err) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: 'TOKEN_EXPIRED', message: 'Authentication token is expired or invalid' }
    });
  }
};
