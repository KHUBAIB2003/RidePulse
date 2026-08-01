import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/httpExceptions.js';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};
