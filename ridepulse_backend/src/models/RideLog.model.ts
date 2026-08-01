import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Hazard.model.js';

export interface IRidePoint {
  lat: number;
  lng: number;
  time: number;
  speed: number;
  ele?: number;
}

export interface IRideLog extends Document {
  userId: Types.ObjectId;
  bikeId: Types.ObjectId;
  title: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  distanceKm: number;
  topSpeedKmh: number;
  avgSpeedKmh: number;
  maxLeanLeftDeg: number;
  maxLeanRightDeg: number;
  maxGForce: number;
  startLocation: IGeoPoint;
  routePolyline?: string;
  routePoints?: IRidePoint[];
  gpxFileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ridePointSchema = new Schema<IRidePoint>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  time: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  ele: { type: Number, default: 0 }
}, { _id: false });

const rideLogSchema = new Schema<IRideLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', required: true, index: true },
  title: { type: String, required: true, trim: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  durationSeconds: { type: Number, required: true },
  distanceKm: { type: Number, required: true },
  topSpeedKmh: { type: Number, default: 0 },
  avgSpeedKmh: { type: Number, default: 0 },
  maxLeanLeftDeg: { type: Number, default: 0 },
  maxLeanRightDeg: { type: Number, default: 0 },
  maxGForce: { type: Number, default: 1.0 },
  startLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  routePolyline: { type: String, default: '' },
  routePoints: [ridePointSchema],
  gpxFileUrl: { type: String, default: '' }
}, {
  timestamps: true
});

rideLogSchema.index({ startLocation: '2dsphere' });
rideLogSchema.index({ userId: 1, startTime: -1 });

export const RideLog = model<IRideLog>('RideLog', rideLogSchema);
