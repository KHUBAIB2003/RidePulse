import { Schema, model, Document, Types } from 'mongoose';

export interface IFuelLog extends Document {
  bikeId: Types.ObjectId;
  userId: Types.ObjectId;
  fuelLiters: number;
  totalCost: number;
  pricePerLiter: number;
  odometerKm: number;
  distanceSinceLastFillKm: number;
  calculatedKmpl: number;
  fuelStationName?: string;
  isFullTank: boolean;
  logDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fuelLogSchema = new Schema<IFuelLog>({
  bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fuelLiters: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  pricePerLiter: { type: Number, required: true },
  odometerKm: { type: Number, required: true },
  distanceSinceLastFillKm: { type: Number, default: 0 },
  calculatedKmpl: { type: Number, default: 0 },
  fuelStationName: { type: String, default: '' },
  isFullTank: { type: Boolean, default: true },
  logDate: { type: Date, required: true, default: Date.now, index: true },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

fuelLogSchema.index({ bikeId: 1, logDate: -1 });

export const FuelLog = model<IFuelLog>('FuelLog', fuelLogSchema);
