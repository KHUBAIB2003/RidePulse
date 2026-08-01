import { Schema, model, Document, Types } from 'mongoose';

export type RideStatus = 'RECORDING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'AUTO_STOPPED';

export interface IWaypoint {
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  altitude: number;
  accuracy: number;
  bearing: number;
  speedKmh: number;
  speedMs: number;
  heading: number;
  distanceFromPreviousM: number;
  segmentTimeSeconds: number;
  timestamp: Date;
  provider: 'gps' | 'network' | 'fused';
  batteryLevel?: number;
  networkStatus?: string;
}

export interface IPauseEvent {
  pausedAt: Date;
  resumedAt?: Date;
  durationSeconds?: number;
}

export interface IRideLog extends Document {
  userId: Types.ObjectId;
  bikeId: Types.ObjectId;
  title: string;
  status: RideStatus;
  startTime: Date;
  endTime?: Date;
  durationSeconds: number;
  movingTimeSeconds: number;
  stoppedTimeSeconds: number;
  distanceKm: number;
  movingDistanceKm: number;
  avgSpeedKmh: number;
  movingAvgSpeedKmh: number;
  maxSpeedKmh: number;
  minSpeedKmh: number;
  avgPaceMinKm: number;
  maxElevationM: number;
  minElevationM: number;
  elevationGainM: number;
  elevationLossM: number;
  maxLeanLeftDeg: number;
  maxLeanRightDeg: number;
  maxGForce: number;
  rideScore: number;
  tags: string[];
  notes?: string;
  startLocation: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  endLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  waypoints: IWaypoint[];
  pauseEvents: IPauseEvent[];
  routePolyline?: string;
  gpxFileUrl?: string;
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const waypointSchema = new Schema<IWaypoint>({
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  altitude: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  bearing: { type: Number, default: 0 },
  speedKmh: { type: Number, default: 0 },
  speedMs: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  distanceFromPreviousM: { type: Number, default: 0 },
  segmentTimeSeconds: { type: Number, default: 0 },
  timestamp: { type: Date, required: true },
  provider: { type: String, enum: ['gps', 'network', 'fused'], default: 'gps' },
  batteryLevel: { type: Number },
  networkStatus: { type: String }
}, { _id: false });

const pauseEventSchema = new Schema<IPauseEvent>({
  pausedAt: { type: Date, required: true },
  resumedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 }
}, { _id: false });

const rideLogSchema = new Schema<IRideLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', required: true, index: true },
  title: { type: String, required: true, trim: true },
  status: { 
    type: String, 
    enum: ['RECORDING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'AUTO_STOPPED'], 
    default: 'RECORDING', 
    index: true 
  },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  movingTimeSeconds: { type: Number, default: 0 },
  stoppedTimeSeconds: { type: Number, default: 0 },
  distanceKm: { type: Number, default: 0 },
  movingDistanceKm: { type: Number, default: 0 },
  avgSpeedKmh: { type: Number, default: 0 },
  movingAvgSpeedKmh: { type: Number, default: 0 },
  maxSpeedKmh: { type: Number, default: 0 },
  minSpeedKmh: { type: Number, default: 0 },
  avgPaceMinKm: { type: Number, default: 0 },
  maxElevationM: { type: Number, default: 0 },
  minElevationM: { type: Number, default: 0 },
  elevationGainM: { type: Number, default: 0 },
  elevationLossM: { type: Number, default: 0 },
  maxLeanLeftDeg: { type: Number, default: 0 },
  maxLeanRightDeg: { type: Number, default: 0 },
  maxGForce: { type: Number, default: 1.0 },
  rideScore: { type: Number, default: 100 },
  tags: { type: [String], default: [] },
  notes: { type: String, trim: true },
  startLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  endLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  waypoints: [waypointSchema],
  pauseEvents: [pauseEventSchema],
  routePolyline: { type: String, default: '' },
  gpxFileUrl: { type: String, default: '' },
  isSoftDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

rideLogSchema.index({ startLocation: '2dsphere' });
rideLogSchema.index({ endLocation: '2dsphere' });
rideLogSchema.index({ userId: 1, isSoftDeleted: 1, startTime: -1 });
rideLogSchema.index({ userId: 1, bikeId: 1, isSoftDeleted: 1 });

export const RideLog = model<IRideLog>('RideLog', rideLogSchema);
