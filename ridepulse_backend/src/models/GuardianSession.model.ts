import { Schema, model, Document, Types } from 'mongoose';

export type CheckInWindowStatus =
  | 'SCHEDULED'
  | 'REMINDER_SENT'
  | 'ACKNOWLEDGED'
  | 'MISSED'
  | 'ESCALATED'
  | 'CANCELLED';

export type EscalationStage = 0 | 1 | 2 | 3 | 4;
// 0 = No escalation
// 1 = Reminder sent to rider
// 2 = Guardian notified
// 3 = Emergency contacts notified
// 4 = SOS recommended (architecture only)

export interface ICheckInWindow {
  windowIndex: number;
  scheduledAt: Date;
  graceDeadline: Date;  // scheduledAt + gracePeriodMinutes
  acknowledgedAt?: Date;
  status: CheckInWindowStatus;
  reminderSentAt?: Date;
  escalationStage: EscalationStage;
  missedAt?: Date;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  note?: string;
}

export interface IGuardianSession extends Document {
  riderId:      Types.ObjectId;
  rideId?:      Types.ObjectId;
  guardianId:   Types.ObjectId;
  guardianUserId: Types.ObjectId;
  /** Title for this session */
  title: string;
  /** Check-in interval in minutes */
  intervalMinutes: number;
  /** Grace period before a missed check-in escalates (minutes) */
  gracePeriodMinutes: number;
  /** Maximum number of scheduled check-in windows */
  maxWindows: number;
  windows: ICheckInWindow[];
  totalWindows: number;
  completedWindows: number;
  missedWindows: number;
  escalationStage: EscalationStage;
  status: 'ACTIVE' | 'COMPLETED' | 'ABORTED' | 'EXPIRED';
  startedAt: Date;
  endedAt?: Date;
  endedBy?: 'RIDER' | 'GUARDIAN' | 'SYSTEM';
  endReason?: string;
  riderStartLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  lastKnownLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const checkInWindowSchema = new Schema<ICheckInWindow>({
  windowIndex:  { type: Number, required: true },
  scheduledAt:  { type: Date, required: true },
  graceDeadline: { type: Date, required: true },
  acknowledgedAt: { type: Date },
  status: {
    type: String,
    enum: ['SCHEDULED', 'REMINDER_SENT', 'ACKNOWLEDGED', 'MISSED', 'ESCALATED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  reminderSentAt: { type: Date },
  escalationStage: { type: Number, default: 0, min: 0, max: 4 },
  missedAt: { type: Date },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  note: { type: String, trim: true }
}, { _id: false });

const guardianSessionSchema = new Schema<IGuardianSession>({
  riderId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rideId:          { type: Schema.Types.ObjectId, ref: 'RideLog', index: true },
  guardianId:      { type: Schema.Types.ObjectId, ref: 'Guardian', required: true, index: true },
  guardianUserId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:           { type: String, required: true, trim: true, default: 'Guardian Safety Session' },
  intervalMinutes: { type: Number, required: true, min: 5, max: 180, default: 30 },
  gracePeriodMinutes: { type: Number, required: true, min: 1, max: 30, default: 5 },
  maxWindows:      { type: Number, default: 100 },
  windows:         [checkInWindowSchema],
  totalWindows:    { type: Number, default: 0 },
  completedWindows: { type: Number, default: 0 },
  missedWindows:   { type: Number, default: 0 },
  escalationStage: { type: Number, default: 0, min: 0, max: 4 },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'ABORTED', 'EXPIRED'],
    default: 'ACTIVE',
    index: true
  },
  startedAt:       { type: Date, required: true, default: Date.now },
  endedAt:         { type: Date },
  endedBy:         { type: String, enum: ['RIDER', 'GUARDIAN', 'SYSTEM'] },
  endReason:       { type: String, trim: true },
  riderStartLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  lastKnownLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  isSoftDeleted: { type: Boolean, default: false, index: true },
  deletedAt:     { type: Date }
}, { timestamps: true });

// Only one active session per ride/guardian pair
guardianSessionSchema.index({ riderId: 1, status: 1, isSoftDeleted: 1 });
guardianSessionSchema.index({ guardianUserId: 1, status: 1 });
guardianSessionSchema.index({ 'windows.scheduledAt': 1, 'windows.status': 1 });

export const GuardianSession = model<IGuardianSession>('GuardianSession', guardianSessionSchema);
