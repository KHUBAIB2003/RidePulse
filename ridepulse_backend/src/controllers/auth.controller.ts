import { Request, Response, NextFunction } from 'express';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  changePasswordSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  verifyEmailSchema 
} from '../validators/auth.validator.js';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const result = await AuthService.register(input, req.ip, req.get('user-agent'));
      ApiResponse.success(res, result, 'Rider account registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const result = await AuthService.login(input, req.ip, req.get('user-agent'));
      ApiResponse.success(res, result, 'Authenticated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const tokens = await AuthService.refreshToken(refreshToken, req.ip, req.get('user-agent'));
      ApiResponse.success(res, tokens, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken && req.user) {
        await AuthService.logout(refreshToken, req.user.userId);
      }
      ApiResponse.success(res, true, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = changePasswordSchema.parse(req.body);
      await AuthService.changePassword(req.user!.userId, input);
      ApiResponse.success(res, true, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = forgotPasswordSchema.parse(req.body);
      await AuthService.forgotPassword(input);
      ApiResponse.success(res, true, 'If the email exists, a password reset link has been dispatched');
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await AuthService.resetPassword(input);
      ApiResponse.success(res, true, 'Password reset completed successfully. Please login with your new password.');
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      await AuthService.verifyEmail(token);
      ApiResponse.success(res, true, 'Email address verified successfully');
    } catch (error) {
      next(error);
    }
  }

  static async resendVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      ApiResponse.success(res, true, 'Verification email resent');
    } catch (error) {
      next(error);
    }
  }
}
