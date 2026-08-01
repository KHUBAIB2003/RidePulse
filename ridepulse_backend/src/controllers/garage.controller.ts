import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { GarageService } from '../services/garage.service.js';
import { 
  createBikeSchema, 
  updateBikeSchema, 
  createMaintenanceSchema, 
  createExpenseSchema, 
  createFuelLogSchema 
} from '../validators/bike.validator.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class GarageController {
  static async createBike(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createBikeSchema.parse(req.body);
      const bike = await GarageService.createBike(req.user!.userId, input);
      ApiResponse.success(res, bike, 'Motorcycle added to Digital Garage successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getBikes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isArchived = req.query.archived === 'true';
      const bikes = await GarageService.getUserBikes(req.user!.userId, isArchived);
      ApiResponse.success(res, bikes, 'Rider motorcycles retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getBikeById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bike = await GarageService.getBikeById(req.params.id, req.user!.userId, req.user!.role === 'ADMIN');
      ApiResponse.success(res, bike, 'Motorcycle details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateBike(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateBikeSchema.parse(req.body);
      const updated = await GarageService.updateBike(req.params.id, req.user!.userId, input, req.user!.role === 'ADMIN');
      ApiResponse.success(res, updated, 'Motorcycle updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteBike(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await GarageService.deleteBike(req.params.id, req.user!.userId, req.user!.role === 'ADMIN');
      ApiResponse.success(res, true, 'Motorcycle removed from garage');
    } catch (error) {
      next(error);
    }
  }

  static async setDefaultBike(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bike = await GarageService.setDefaultBike(req.params.id, req.user!.userId);
      ApiResponse.success(res, bike, 'Default motorcycle updated');
    } catch (error) {
      next(error);
    }
  }

  static async archiveBike(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bike = await GarageService.toggleArchiveBike(req.params.id, req.user!.userId);
      ApiResponse.success(res, bike, 'Motorcycle archive state updated');
    } catch (error) {
      next(error);
    }
  }

  static async getStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await GarageService.getGarageStatistics(req.user!.userId);
      ApiResponse.success(res, stats, 'Garage statistics retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async addMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createMaintenanceSchema.parse(req.body);
      const log = await GarageService.addMaintenanceLog(req.params.id, req.user!.userId, input);
      ApiResponse.success(res, log, 'Maintenance service logged successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await GarageService.getMaintenanceLogs(req.params.id, req.user!.userId);
      ApiResponse.success(res, logs, 'Maintenance history retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async addExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createExpenseSchema.parse(req.body);
      const expense = await GarageService.addExpense(req.params.id, req.user!.userId, input);
      ApiResponse.success(res, expense, 'Expense logged successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getExpenses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const expenses = await GarageService.getExpenses(req.params.id, req.user!.userId);
      ApiResponse.success(res, expenses, 'Expenses retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async addFuelLog(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createFuelLogSchema.parse(req.body);
      const fuelLog = await GarageService.addFuelLog(req.params.id, req.user!.userId, input);
      ApiResponse.success(res, fuelLog, 'Fuel fill record logged successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getFuelLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fuelLogs = await GarageService.getFuelLogs(req.params.id, req.user!.userId);
      ApiResponse.success(res, fuelLogs, 'Fuel log history retrieved');
    } catch (error) {
      next(error);
    }
  }
}
