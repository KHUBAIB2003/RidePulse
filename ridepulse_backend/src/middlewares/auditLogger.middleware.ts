import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { logger } from '../utils/logger.util.js';

export const auditLoggerMiddleware = (actionName: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        logger.info({
          audit: true,
          action: actionName,
          userId: req.user?.userId || 'anonymous',
          role: req.user?.role || 'none',
          ip: req.ip,
          path: req.originalUrl,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString()
        });
      }
    });
    next();
  };
};
