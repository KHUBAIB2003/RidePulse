import { Schema, model, Document, Types } from 'mongoose';

export type SOSStatus = 'COUNTDOWN' | 'TRIGGERED' | 'DISPATCHING' | 'TRACKING' | 'RESOLVED' | 'CANCELLED' | 'EXPIRED';

export type SOSCategory = 
  | 'ACCIDENT'
  | 'MEDICAL_EMERGENCY'
  | 'BIKE_BREAKDOWN'
  | 'VEHICLE_THEFT'
  | 'ROBBERY'
  | 'MECHANICAL_FAILURE'
  | 'FIRE'
  | 'NATURAL_DISASTER'
  | 'ROAD_RAGE'
  | 'OTHER';

export type SOSSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ISOSTimelineEvent {
  event: string;
  description: string;
  timestamp: Date;
  performedBy?: string;
  metadata?: Record<string, any>;
}

export interface ISOSLocationUpdate {
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  altitude: number;
  accuracy: number;
  bearing: number;
  speedKmh: number;
  heading: number;
  timestamp: Date;
  provider: string;
  batteryPercentage?: number;
  networkType?: string;
}

export interface ISOSDispatchRecord {
  contactName: string;
  phoneNumber: string;
  relationship: string;
  channel: 'SMS' | 'WHATSAPP' | 'PUSH' | 'EMAIL';
  status: 'QUEUED' | 'SENT' | 'FAILED';
  dispatchedAt: Date;
  messageId?: string;
}

export interface ISOSIncident extends Document {
  userId: Types.ObjectId;
  bikeId?: Types.ObjectId;
  status: SOSStatus;
  category: SOSCategory;
  severity: SOSSeverity;
  countdownSeconds: number;
  triggerTime?: Date;
  resolvedTime?: Date;
  durationSeconds: number;
  escalationLevel: number; // 1 to 5
  manualNotes?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  altitude: number;
  accuracy: number;
  bearing: number;
  speedKmh: number;
  batteryPercentage?: number;
  networkType?: string;
  liveTrackpoints: ISOSLocationUpdate[];
  timeline: ISOSTimelineEvent[];
  dispatchQueue: ISOSDispatchRecord[];
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const timelineEventSchema = new Schema<ISOSTimelineEvent>({
  event: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  performedBy: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, { _id: false });

const locationUpdateSchema = new Schema<ISOSLocationUpdate>({
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  altitude: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  bearing: { type: Number, default: 0 },
  speedKmh: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Date, required: true, default: Date.now },
  provider: { type: String, default: 'gps' },
  batteryPercentage: { type: Number },
  networkType: { type: String }
}, { _id: false });

const dispatchRecordSchema = new Schema<ISOSDispatchRecord>({
  contactName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  relationship: { type: String, default: 'Emergency Contact' },
  channel: { type: String, enum: ['SMS', 'WHATSAPP', 'PUSH', 'EMAIL'], default: 'SMS' },
  status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED'], default: 'QUEUED' },
  dispatchedAt: { type: Date, default: Date.now },
  messageId: { type: String }
}, { _id: false });

const sosIncidentSchema = new Schema<ISOSIncident>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', index: true },
  status: {
    type: String,
    enum: ['COUNTDOWN', 'TRIGGERED', 'DISPATCHING', 'TRACKING', 'RESOLVED', 'CANCELLED', 'EXPIRED'],
    default: 'COUNTDOWN',
    index: true
  },
  category: {
    type: String,
    enum: [
      'ACCIDENT', 'MEDICAL_EMERGENCY', 'BIKE_BREAKDOWN', 'VEHICLE_THEFT',
      'ROBBERY', 'MECHANICAL_FAILURE', 'FIRE', 'NATURAL_DISASTER', 'ROAD_RAGE', 'OTHER'
    ],
    default: 'ACCIDENT',
    index: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH',
    index: true
  },
  countdownSeconds: { type: Number, default: 10 },
  triggerTime: { type: Date },
  resolvedTime: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  escalationLevel: { type: Number, default: 1, min: 1, max: 5 },
  manualNotes: { type: String, trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  altitude: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  bearing: { type: Number, default: 0 },
  speedKmh: { type: Number, default: 0 },
  batteryPercentage: { type: Number, default: 100 },
  networkType: { type: String, default: '4G' },
  liveTrackpoints: [locationUpdateSchema],
  timeline: [timelineEventSchema],
  dispatchQueue: [dispatchRecordSchema],
  isSoftDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

sosIncidentSchema.index({ location: '2dsphere' });
sosIncidentSchema.index({ userId: 1, isSoftDeleted: 1, status: 1 });
sosIncidentSchema.index({ createdAt: -1, status: 1 });

export const SOSIncident = model<ISOSIncident>('SOSIncident', sosIncidentSchema);
