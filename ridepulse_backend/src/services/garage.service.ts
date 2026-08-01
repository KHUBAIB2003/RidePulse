import { Bike, IBike } from '../models/Bike.model.js';
import { MaintenanceLog, IMaintenanceLog } from '../models/MaintenanceLog.model.js';
import { Expense, IExpense } from '../models/Expense.model.js';
import { FuelLog, IFuelLog } from '../models/FuelLog.model.js';
import { Reminder } from '../models/Reminder.model.js';
import { 
  CreateBikeInput, 
  UpdateBikeInput, 
  CreateMaintenanceInput, 
  CreateExpenseInput, 
  CreateFuelLogInput 
} from '../validators/bike.validator.js';
import { NotFoundError, ForbiddenError } from '../errors/httpExceptions.js';

export class GarageService {
  static async createBike(userId: string, input: CreateBikeInput): Promise<IBike> {
    const existingCount = await Bike.countDocuments({ userId, isSoftDeleted: false });
    const isDefault = input.isDefault || existingCount === 0;

    if (isDefault) {
      await Bike.updateMany({ userId }, { isDefault: false });
    }

    const bike = new Bike({
      ...input,
      userId,
      isDefault,
      currentMileageKm: input.odometerKm,
      isArchived: false,
      isSoftDeleted: false
    });

    await bike.save();
    return bike;
  }

  static async getUserBikes(userId: string, isArchived = false): Promise<IBike[]> {
    return Bike.find({ userId, isArchived, isSoftDeleted: false })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  static async getBikeById(bikeId: string, userId: string, isAdmin = false): Promise<IBike> {
    const bike = await Bike.findOne({ _id: bikeId, isSoftDeleted: false });
    if (!bike) throw new NotFoundError('Motorcycle not found in garage');

    if (!isAdmin && bike.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied: Motorcycle belongs to another rider');
    }

    return bike;
  }

  static async updateBike(bikeId: string, userId: string, input: UpdateBikeInput, isAdmin = false): Promise<IBike> {
    const bike = await this.getBikeById(bikeId, userId, isAdmin);

    if (input.isDefault && !bike.isDefault) {
      await Bike.updateMany({ userId: bike.userId }, { isDefault: false });
    }

    Object.assign(bike, input);
    if (input.odometerKm && input.odometerKm > bike.currentMileageKm) {
      bike.currentMileageKm = input.odometerKm;
    }

    await bike.save();
    return bike;
  }

  static async deleteBike(bikeId: string, userId: string, isAdmin = false): Promise<boolean> {
    const bike = await this.getBikeById(bikeId, userId, isAdmin);
    bike.isSoftDeleted = true;
    bike.deletedAt = new Date();
    await bike.save();

    if (bike.isDefault) {
      const nextBike = await Bike.findOne({ userId: bike.userId, isSoftDeleted: false }).sort({ createdAt: -1 });
      if (nextBike) {
        nextBike.isDefault = true;
        await nextBike.save();
      }
    }

    return true;
  }

  static async setDefaultBike(bikeId: string, userId: string): Promise<IBike> {
    const bike = await this.getBikeById(bikeId, userId);
    await Bike.updateMany({ userId }, { isDefault: false });
    bike.isDefault = true;
    await bike.save();
    return bike;
  }

  static async toggleArchiveBike(bikeId: string, userId: string): Promise<IBike> {
    const bike = await this.getBikeById(bikeId, userId);
    bike.isArchived = !bike.isArchived;
    bike.status = bike.isArchived ? 'ARCHIVED' : 'ACTIVE';
    await bike.save();
    return bike;
  }

  static async getGarageStatistics(userId: string): Promise<any> {
    const bikes = await Bike.find({ userId, isSoftDeleted: false });
    const totalBikes = bikes.length;
    const totalMileageKm = bikes.reduce((acc, b) => acc + b.odometerKm, 0);

    const bikeIds = bikes.map(b => b._id);
    const totalExpensesAgg = await Expense.aggregate([
      { $match: { bikeId: { $in: bikeIds } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalExpenseCost = totalExpensesAgg[0]?.total || 0;

    const healthScores = bikes.map(b => b.calculateHealthScore());
    const avgHealthScore = healthScores.length > 0 ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) : 100;

    return {
      totalBikes,
      totalMileageKm,
      totalExpenseCost,
      avgHealthScore
    };
  }

  static async addMaintenanceLog(bikeId: string, userId: string, input: CreateMaintenanceInput): Promise<IMaintenanceLog> {
    const bike = await this.getBikeById(bikeId, userId);

    const log = new MaintenanceLog({
      ...input,
      bikeId: bike._id,
      userId,
      serviceDate: input.serviceDate ? new Date(input.serviceDate) : new Date()
    });

    await log.save();

    await Expense.create({
      bikeId: bike._id,
      userId,
      category: 'SERVICE',
      amount: input.cost,
      expenseDate: log.serviceDate,
      notes: `Service: ${input.title}`
    });

    if (input.odometerAtServiceKm > bike.odometerKm) {
      bike.odometerKm = input.odometerAtServiceKm;
      bike.currentMileageKm = input.odometerAtServiceKm;
      await bike.save();
    }

    if (input.nextServiceDueKm || input.nextServiceDueDate) {
      await Reminder.create({
        bikeId: bike._id,
        userId,
        title: `Next Service Due: ${input.title}`,
        type: input.category === 'OIL_CHANGE' ? 'OIL_CHANGE' : 'CUSTOM',
        dueDate: input.nextServiceDueDate ? new Date(input.nextServiceDueDate) : undefined,
        dueOdometerKm: input.nextServiceDueKm
      });
    }

    return log;
  }

  static async getMaintenanceLogs(bikeId: string, userId: string): Promise<IMaintenanceLog[]> {
    await this.getBikeById(bikeId, userId);
    return MaintenanceLog.find({ bikeId }).sort({ serviceDate: -1 }).exec();
  }

  static async addExpense(bikeId: string, userId: string, input: CreateExpenseInput): Promise<IExpense> {
    const bike = await this.getBikeById(bikeId, userId);

    const expense = new Expense({
      ...input,
      bikeId: bike._id,
      userId,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date()
    });

    await expense.save();
    return expense;
  }

  static async getExpenses(bikeId: string, userId: string): Promise<IExpense[]> {
    await this.getBikeById(bikeId, userId);
    return Expense.find({ bikeId }).sort({ expenseDate: -1 }).exec();
  }

  static async addFuelLog(bikeId: string, userId: string, input: CreateFuelLogInput): Promise<IFuelLog> {
    const bike = await this.getBikeById(bikeId, userId);

    const previousLog = await FuelLog.findOne({ bikeId }).sort({ odometerKm: -1 });

    let distanceSinceLastFillKm = 0;
    let calculatedKmpl = 0;

    if (previousLog && input.odometerKm > previousLog.odometerKm) {
      distanceSinceLastFillKm = input.odometerKm - previousLog.odometerKm;
      if (input.fuelLiters > 0) {
        calculatedKmpl = parseFloat((distanceSinceLastFillKm / input.fuelLiters).toFixed(2));
      }
    }

    const pricePerLiter = parseFloat((input.totalCost / input.fuelLiters).toFixed(2));

    const fuelLog = new FuelLog({
      ...input,
      bikeId: bike._id,
      userId,
      pricePerLiter,
      distanceSinceLastFillKm,
      calculatedKmpl,
      logDate: input.logDate ? new Date(input.logDate) : new Date()
    });

    await fuelLog.save();

    await Expense.create({
      bikeId: bike._id,
      userId,
      category: 'FUEL',
      amount: input.totalCost,
      expenseDate: fuelLog.logDate,
      notes: `Fuel: ${input.fuelLiters}L @ ${input.fuelStationName || 'Station'}`
    });

    if (calculatedKmpl > 0) {
      bike.averageMileageKmpl = parseFloat(((bike.averageMileageKmpl + calculatedKmpl) / 2).toFixed(2));
    }
    if (input.odometerKm > bike.odometerKm) {
      bike.odometerKm = input.odometerKm;
      bike.currentMileageKm = input.odometerKm;
    }
    await bike.save();

    return fuelLog;
  }

  static async getFuelLogs(bikeId: string, userId: string): Promise<IFuelLog[]> {
    await this.getBikeById(bikeId, userId);
    return FuelLog.find({ bikeId }).sort({ logDate: -1 }).exec();
  }
}
