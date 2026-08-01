import { Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util.js';
import { RequestWithId } from './requestId.middleware.js';

export const requestLoggerMiddleware = (req: RequestWithId, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
};
