import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { RideService } from '../services/ride.service.js';
import { 
  startRideSchema, 
  pauseRideSchema, 
  resumeRideSchema, 
  stopRideSchema, 
  addLocationSchema, 
  batchTelemetrySchema,
  queryRidesSchema 
} from '../validators/ride.validator.js';

export class RideController {
  static async startRide(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = startRideSchema.parse(req.body);
      const ride = await RideService.startRide(req.user!.userId, validatedInput);
      res.status(201).json({
        success: true,
        data: ride,
        message: 'Ride session started successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async pauseRide(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = pauseRideSchema.parse(req.body);
      const ride = await RideService.pauseRide(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: ride,
        message: 'Ride session paused'
      });
    } catch (error) {
      next(error);
    }
  }

  static async resumeRide(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = resumeRideSchema.parse(req.body);
      const ride = await RideService.resumeRide(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: ride,
        message: 'Ride session resumed'
      });
    } catch (error) {
      next(error);
    }
  }

  static async stopRide(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = stopRideSchema.parse(req.body);
      const ride = await RideService.stopRide(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: ride,
        message: 'Ride session completed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async addLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = addLocationSchema.parse(req.body);
      const ride = await RideService.addLocation(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: ride,
        message: 'Location waypoint added'
      });
    } catch (error) {
      next(error);
    }
  }

  static async addBatchTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = batchTelemetrySchema.parse(req.body);
      const ride = await RideService.addBatchTelemetry(req.user!.userId, validatedInput);
      res.status(200).json({
        success: true,
        data: ride,
        message: 'Batch telemetry points processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRides(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = queryRidesSchema.parse(req.query);
      const isAdmin = req.user?.role === 'ADMIN';
      const result = await RideService.getRides(req.user!.userId, validatedQuery, isAdmin);
      res.status(200).json({
        success: true,
        data: result.rides,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRideById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const ride = await RideService.getRideById(req.params.id, req.user!.userId, isAdmin);
      res.status(200).json({
        success: true,
        data: ride
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRideReplay(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const replay = await RideService.getRideReplay(req.params.id, req.user!.userId, isAdmin);
      res.status(200).json({
        success: true,
        data: replay
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRideStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await RideService.getRideStatistics(req.user!.userId);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportGPX(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const gpxXml = await RideService.exportGPX(req.params.id, req.user!.userId, isAdmin);
      res.setHeader('Content-Type', 'application/gpx+xml');
      res.setHeader('Content-Disposition', `attachment; filename="ride_${req.params.id}.gpx"`);
      res.status(200).send(gpxXml);
    } catch (error) {
      next(error);
    }
  }

  static async exportGeoJSON(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const geojson = await RideService.exportGeoJSON(req.params.id, req.user!.userId, isAdmin);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="ride_${req.params.id}.geojson"`);
      res.status(200).json(geojson);
    } catch (error) {
      next(error);
    }
  }

  static async exportCSV(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const csv = await RideService.exportCSV(req.params.id, req.user!.userId, isAdmin);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ride_${req.params.id}.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  static async deleteRide(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      await RideService.deleteRide(req.params.id, req.user!.userId, isAdmin);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Ride deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
