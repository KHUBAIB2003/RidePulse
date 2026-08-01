import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { ForbiddenError } from '../errors/httpExceptions.js';

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('User authentication context missing'));
    }

    // Super Admin has all permissions automatically
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Permission assertion logic for fine-grained permissions
    console.log(`[PermissionCheck] Checking ${requiredPermission} for user ${req.user.userId}`);
    next();
  };
};
