import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = registerSchema.parse(req.body);
      const result = await AuthService.register(validatedInput);

      res.status(201).json({
        success: true,
        data: result,
        error: null,
        meta: { timestamp: Date.now() }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const result = await AuthService.login(validatedInput);

      res.status(200).json({
        success: true,
        data: result,
        error: null,
        meta: { timestamp: Date.now() }
      });
    } catch (error) {
      next(error);
    }
  }
}
