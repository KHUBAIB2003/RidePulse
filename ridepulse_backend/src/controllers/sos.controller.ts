import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { SOSService } from '../services/sos.service.js';
import { 
  startSOSSchema, 
  cancelSOSSchema, 
  triggerSOSSchema, 
  addSOSLocationSchema, 
  resolveSOSSchema,
  adminCloseSOSSchema,
  adminEscalateSOSSchema 
} from '../validators/sos.validator.js';

export class SOSController {
  static async startSOS(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = startSOSSchema.parse(req.body);
      const incident = await SOSService.startSOS(req.user!.userId, validatedInput);
      res.status(201).json({
        success: true,
        data: incident,
        message: 'SOS countdown initiated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelSOS(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = cancelSOSSchema.parse(req.body);
      const incident = await SOSService.cancelSOS(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: incident,
        message: 'SOS incident cancelled'
      });
    } catch (error) {
      next(error);
    }
  }

  static async triggerSOS(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = triggerSOSSchema.parse(req.body);
      const incident = await SOSService.triggerSOS(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: incident,
        message: 'Emergency SOS signal triggered & emergency dispatches sent'
      });
    } catch (error) {
      next(error);
    }
  }

  static async addLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = addSOSLocationSchema.parse(req.body);
      const incident = await SOSService.addLocation(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: incident,
        message: 'Live emergency location updated'
      });
    } catch (error) {
      next(error);
    }
  }

  static async resolveSOS(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = resolveSOSSchema.parse(req.body);
      const incident = await SOSService.resolveSOS(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: incident,
        message: 'SOS emergency incident resolved safely'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentActiveSOS(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeSOS = await SOSService.getCurrentActiveSOS(req.user!.userId);
      res.status(200).json({
        success: true,
        data: activeSOS
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSOSHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await SOSService.getSOSHistory(req.user!.userId);
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSOSById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const incident = await SOSService.getSOSById(req.params.id, req.user!.userId, isAdmin);
      res.status(200).json({
        success: true,
        data: incident
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSOSTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const timeline = await SOSService.getSOSTimeline(req.params.id, req.user!.userId, isAdmin);
      res.status(200).json({
        success: true,
        data: timeline
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSOS(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      await SOSService.deleteSOS(req.params.id, req.user!.userId, isAdmin);
      res.status(200).json({
        success: true,
        data: null,
        message: 'SOS incident record deleted'
      });
    } catch (error) {
      next(error);
    }
  }

  // --- ADMIN ENDPOINTS ---

  static async getAllIncidentsAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const incidents = await SOSService.getAllIncidentsAdmin();
      res.status(200).json({
        success: true,
        data: incidents
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminForceClose(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = adminCloseSOSSchema.parse(req.body);
      const incident = await SOSService.adminForceClose(req.params.id, validatedInput);
      res.status(200).json({
        success: true,
        data: incident,
        message: 'Incident force closed by safety administrator'
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminEscalate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = adminEscalateSOSSchema.parse(req.body);
      const incident = await SOSService.adminEscalate(req.params.id, validatedInput);
      res.status(200).json({
        success: true,
        data: incident,
        message: 'Incident escalated by safety administrator'
      });
    } catch (error) {
      next(error);
    }
  }
}
