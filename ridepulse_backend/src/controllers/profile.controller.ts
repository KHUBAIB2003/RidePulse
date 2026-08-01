import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { ProfileService } from '../services/profile.service.js';
import { updateProfileSchema, updatePreferencesSchema, emergencyContactSchema } from '../validators/profile.validator.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import { parsePagination } from '../utils/pagination.util.js';
import { BadRequestError } from '../errors/httpExceptions.js';

export class ProfileController {
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await ProfileService.getProfile(req.user!.userId);
      ApiResponse.success(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateProfileSchema.parse(req.body);
      const updated = await ProfileService.updateProfile(req.user!.userId, input);
      ApiResponse.success(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updatePreferencesSchema.parse(req.body);
      const updated = await ProfileService.updatePreferences(req.user!.userId, input);
      ApiResponse.success(res, updated, 'Preferences updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('No avatar image file provided');
      }
      const result = await ProfileService.uploadAvatar(
        req.user!.userId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      ApiResponse.success(res, result, 'Avatar uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProfileService.deleteAvatar(req.user!.userId);
      ApiResponse.success(res, true, 'Avatar deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await ProfileService.getSessions(req.user!.userId);
      ApiResponse.success(res, sessions, 'Active sessions retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async deleteSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProfileService.deleteSession(req.user!.userId, req.params.id);
      ApiResponse.success(res, true, 'Session terminated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAllSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProfileService.deleteOtherSessions(req.user!.userId);
      ApiResponse.success(res, true, 'All other sessions terminated');
    } catch (error) {
      next(error);
    }
  }

  static async getActivityLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await ProfileService.getActivityLogs(req.user!.userId, page, limit);
      ApiResponse.success(res, result.items, 'Activity logs retrieved', 200, {
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async addEmergencyContact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = emergencyContactSchema.parse(req.body);
      const contacts = await ProfileService.addEmergencyContact(req.user!.userId, input);
      ApiResponse.success(res, contacts, 'Emergency contact added', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateEmergencyContact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = emergencyContactSchema.parse(req.body);
      const contacts = await ProfileService.updateEmergencyContact(req.user!.userId, req.params.id, input);
      ApiResponse.success(res, contacts, 'Emergency contact updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteEmergencyContact(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const contacts = await ProfileService.deleteEmergencyContact(req.user!.userId, req.params.id);
      ApiResponse.success(res, contacts, 'Emergency contact deleted');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProfileService.softDeleteAccount(req.user!.userId);
      ApiResponse.success(res, true, 'Account soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
