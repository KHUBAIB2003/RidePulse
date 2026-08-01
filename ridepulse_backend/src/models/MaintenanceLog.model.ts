import { Schema, model, Document, Types } from 'mongoose';

export type MaintenanceCategory = 
  | 'OIL_CHANGE' 
  | 'CHAIN_SERVICE' 
  | 'BRAKE_SERVICE' 
  | 'TYRE_CHANGE' 
  | 'BATTERY' 
  | 'ENGINE' 
  | 'INSPECTION' 
  | 'CUSTOM';

export interface IMaintenanceLog extends Document {
  bikeId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  category: MaintenanceCategory;
  cost: number;
  serviceCenter?: string;
  odometerAtServiceKm: number;
  nextServiceDueKm?: number;
  nextServiceDueDate?: Date;
  receiptUrl?: string;
  notes?: string;
  status: 'COMPLETED' | 'PENDING' | 'OVERDUE';
  serviceDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceLogSchema = new Schema<IMaintenanceLog>({
  bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['OIL_CHANGE', 'CHAIN_SERVICE', 'BRAKE_SERVICE', 'TYRE_CHANGE', 'BATTERY', 'ENGINE', 'INSPECTION', 'CUSTOM'],
    required: true,
    index: true
  },
  cost: { type: Number, required: true, default: 0 },
  serviceCenter: { type: String, default: '' },
  odometerAtServiceKm: { type: Number, required: true },
  nextServiceDueKm: { type: Number },
  nextServiceDueDate: { type: Date },
  receiptUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['COMPLETED', 'PENDING', 'OVERDUE'], default: 'COMPLETED', index: true },
  serviceDate: { type: Date, required: true, default: Date.now, index: true }
}, {
  timestamps: true
});

maintenanceLogSchema.index({ bikeId: 1, serviceDate: -1 });

export const MaintenanceLog = model<IMaintenanceLog>('MaintenanceLog', maintenanceLogSchema);
