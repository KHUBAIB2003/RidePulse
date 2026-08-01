import { Schema, model, Document, Types } from 'mongoose';

export interface IBike extends Document {
  userId: Types.ObjectId;
  make: string; // e.g. Ducati, Royal Enfield, Yamaha
  brand?: string;
  bikeModel: string; // e.g. Panigale V4 S, Himalayan 450
  variant?: string;
  year: number;
  engineCc: number;
  vin?: string;
  registrationNumber?: string;
  licensePlate?: string;
  engineNumber?: string;
  chassisNumber?: string;
  fuelType: 'PETROL' | 'ELECTRIC' | 'HYBRID';
  transmission: 'MANUAL' | 'AUTOMATIC' | 'QUICKSHIFTER';
  color?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  insuranceCompany?: string;
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  pucExpiry?: Date;
  registrationExpiry?: Date;
  odometerKm: number;
  currentMileageKm: number;
  averageMileageKmpl: number;
  fuelCapacityLiters: number;
  tyreSizeFront?: string;
  tyreSizeRear?: string;
  imageUrl?: string;
  nickname?: string;
  notes?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'ARCHIVED';
  isDefault: boolean;
  isArchived: boolean;
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  calculateHealthScore(): number;
}

const bikeSchema = new Schema<IBike>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  make: { type: String, required: true, trim: true },
  brand: { type: String, default: '', trim: true },
  bikeModel: { type: String, required: true, trim: true },
  variant: { type: String, default: '', trim: true },
  year: { type: Number, required: true },
  engineCc: { type: Number, required: true, default: 150 },
  vin: { type: String, default: '', trim: true },
  registrationNumber: { type: String, default: '', trim: true },
  licensePlate: { type: String, default: '', trim: true },
  engineNumber: { type: String, default: '', trim: true },
  chassisNumber: { type: String, default: '', trim: true },
  fuelType: { type: String, enum: ['PETROL', 'ELECTRIC', 'HYBRID'], default: 'PETROL' },
  transmission: { type: String, enum: ['MANUAL', 'AUTOMATIC', 'QUICKSHIFTER'], default: 'MANUAL' },
  color: { type: String, default: '' },
  purchaseDate: { type: Date },
  purchasePrice: { type: Number, default: 0 },
  insuranceCompany: { type: String, default: '' },
  insuranceNumber: { type: String, default: '' },
  insuranceExpiry: { type: Date },
  pucExpiry: { type: Date },
  registrationExpiry: { type: Date },
  odometerKm: { type: Number, required: true, default: 0 },
  currentMileageKm: { type: Number, required: true, default: 0 },
  averageMileageKmpl: { type: Number, default: 35.0 },
  fuelCapacityLiters: { type: Number, default: 13.5 },
  tyreSizeFront: { type: String, default: '' },
  tyreSizeRear: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  nickname: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'ARCHIVED'], default: 'ACTIVE', index: true },
  isDefault: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false, index: true },
  isSoftDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

bikeSchema.index({ userId: 1, isDefault: -1 });
bikeSchema.index({ userId: 1, isSoftDeleted: 1 });

bikeSchema.methods.calculateHealthScore = function (): number {
  let score = 100;
  const now = new Date();

  // Deduct points for expired documents
  if (this.insuranceExpiry && this.insuranceExpiry < now) score -= 25;
  if (this.pucExpiry && this.pucExpiry < now) score -= 15;
  if (this.registrationExpiry && this.registrationExpiry < now) score -= 30;

  // Deduct points for high mileage without status update
  if (this.status === 'MAINTENANCE') score -= 20;

  return Math.max(0, Math.min(100, score));
};

export const Bike = model<IBike>('Bike', bikeSchema);
