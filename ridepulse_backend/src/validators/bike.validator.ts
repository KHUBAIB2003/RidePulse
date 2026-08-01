import { z } from 'zod';

export const createBikeSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  brand: z.string().optional(),
  bikeModel: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  engineCc: z.number().positive(),
  vin: z.string().optional(),
  registrationNumber: z.string().optional(),
  licensePlate: z.string().optional(),
  engineNumber: z.string().optional(),
  chassisNumber: z.string().optional(),
  fuelType: z.enum(['PETROL', 'ELECTRIC', 'HYBRID']).default('PETROL'),
  transmission: z.enum(['MANUAL', 'AUTOMATIC', 'QUICKSHIFTER']).default('MANUAL'),
  color: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().optional(),
  insuranceCompany: z.string().optional(),
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.string().datetime().optional(),
  pucExpiry: z.string().datetime().optional(),
  registrationExpiry: z.string().datetime().optional(),
  odometerKm: z.number().min(0).default(0),
  fuelCapacityLiters: z.number().positive().default(13.5),
  tyreSizeFront: z.string().optional(),
  tyreSizeRear: z.string().optional(),
  imageUrl: z.string().optional(),
  nickname: z.string().optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().default(false)
});

export const updateBikeSchema = createBikeSchema.partial();

export const createMaintenanceSchema = z.object({
  title: z.string().min(1, 'Maintenance title is required'),
  category: z.enum(['OIL_CHANGE', 'CHAIN_SERVICE', 'BRAKE_SERVICE', 'TYRE_CHANGE', 'BATTERY', 'ENGINE', 'INSPECTION', 'CUSTOM']),
  cost: z.number().min(0),
  serviceCenter: z.string().optional(),
  odometerAtServiceKm: z.number().min(0),
  nextServiceDueKm: z.number().min(0).optional(),
  nextServiceDueDate: z.string().datetime().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
  serviceDate: z.string().datetime().optional()
});

export const createExpenseSchema = z.object({
  category: z.enum(['FUEL', 'SERVICE', 'REPAIR', 'INSURANCE', 'ACCESSORIES', 'PARKING', 'TOLLS', 'OTHER']),
  amount: z.number().positive('Expense amount must be positive'),
  currency: z.string().default('INR'),
  expenseDate: z.string().datetime().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional()
});

export const createFuelLogSchema = z.object({
  fuelLiters: z.number().positive('Fuel liters must be positive'),
  totalCost: z.number().positive('Total cost must be positive'),
  odometerKm: z.number().positive('Odometer reading is required'),
  fuelStationName: z.string().optional(),
  isFullTank: z.boolean().default(true),
  logDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

export type CreateBikeInput = z.infer<typeof createBikeSchema>;
export type UpdateBikeInput = z.infer<typeof updateBikeSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;
