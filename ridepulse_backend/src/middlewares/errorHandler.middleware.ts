import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util.js';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    path: req.path,
    method: req.method,
    statusCode,
    message,
    stack: err.stack
  });

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : 'SERVER_ERROR',
      message: message
    },
    meta: {
      timestamp: Date.now(),
      path: req.path
    }
  });
};
