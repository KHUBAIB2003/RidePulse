import { Schema, model, Document, Types } from 'mongoose';

export interface IBike extends Document {
  userId: Types.ObjectId;
  make: string;
  bikeModel: string;
  year: number;
  currentMileageKm: number;
  lastOilChangeKm: number;
  oilIntervalKm: number;
  lastBrakeCheckKm: number;
  brakeIntervalKm: number;
  lastChainLubeKm: number;
  chainIntervalKm: number;
  lastTireCheckKm: number;
  tireIntervalKm: number;
  isDefault: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bikeSchema = new Schema<IBike>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  make: { type: String, required: true, trim: true },
  bikeModel: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  currentMileageKm: { type: Number, required: true, default: 0 },
  lastOilChangeKm: { type: Number, default: 0 },
  oilIntervalKm: { type: Number, default: 3000 },
  lastBrakeCheckKm: { type: Number, default: 0 },
  brakeIntervalKm: { type: Number, default: 2500 },
  lastChainLubeKm: { type: Number, default: 0 },
  chainIntervalKm: { type: Number, default: 500 },
  lastTireCheckKm: { type: Number, default: 0 },
  tireIntervalKm: { type: Number, default: 4000 },
  isDefault: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

bikeSchema.index({ userId: 1, isDefault: -1 });

export const Bike = model<IBike>('Bike', bikeSchema);
