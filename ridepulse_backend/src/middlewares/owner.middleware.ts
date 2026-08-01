import { Response, NextFunction } from 'express';
import { Model, Document } from 'mongoose';
import { AuthenticatedRequest } from './auth.middleware.js';
import { ForbiddenError, NotFoundError } from '../errors/httpExceptions.js';

export const verifyOwnership = <T extends Document>(
  model: Model<T>,
  ownerField: string = 'userId',
  paramName: string = 'id'
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('Authentication context required'));
      }

      const resourceId = req.params[paramName];
      const resource = await model.findById(resourceId);

      if (!resource) {
        return next(new NotFoundError('Resource not found'));
      }

      const resourceOwnerId = (resource as any)[ownerField]?.toString();
      if (resourceOwnerId !== req.user.userId && req.user.role !== 'SUPER_ADMIN') {
        return next(new ForbiddenError('You do not have permission to modify this resource'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
