import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/httpExceptions.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import { logger } from '../utils/logger.util.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response => {
  if (err instanceof AppError) {
    logger.warn({
      path: req.originalUrl,
      method: req.method,
      statusCode: err.statusCode,
      message: err.message
    });
    const errorCode = err.statusCode === 400 ? 'BAD_REQUEST'
      : err.statusCode === 401 ? 'UNAUTHORIZED'
      : err.statusCode === 403 ? 'FORBIDDEN'
      : err.statusCode === 404 ? 'NOT_FOUND'
      : err.statusCode === 409 ? 'CONFLICT'
      : err.statusCode === 422 ? 'UNPROCESSABLE_ENTITY'
      : 'SERVER_ERROR';

    return ApiResponse.error(res, err.message, err.statusCode, errorCode, {
      path: req.originalUrl
    });
  }

  logger.error({
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack
  });

  return ApiResponse.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error occurred' : err.message,
    500,
    'INTERNAL_SERVER_ERROR',
    { path: req.originalUrl }
  );
};
