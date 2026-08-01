import { Schema, model, Document, Types } from 'mongoose';

export type CheckInStatus = 'SCHEDULED' | 'SENT' | 'ACKNOWLEDGED' | 'MISSED' | 'ESCALATED' | 'CANCELLED';

export interface ICheckInWindow {
  scheduledAt: Date;
  deadline: Date;
  acknowledgedAt?: Date;
  status: CheckInStatus;
  reminderSentAt?: Date;
  escalatedAt?: Date;
}

export interface ICheckIn extends Document {
  userId: Types.ObjectId;
  rideId?: Types.ObjectId;
  title: string;
  intervalMinutes: number;
  totalWindows: number;
  completedWindows: number;
  missedWindows: number;
  windows: ICheckInWindow[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  status: 'ACTIVE' | 'COMPLETED' | 'ABORTED';
  autoEscalateOnMiss: boolean;
  escalationContactCount: number;
  startedAt: Date;
  endedAt?: Date;
  notes?: string;
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const checkInWindowSchema = new Schema<ICheckInWindow>({
  scheduledAt: { type: Date, required: true },
  deadline:    { type: Date, required: true },
  acknowledgedAt: { type: Date },
  status: {
    type: String,
    enum: ['SCHEDULED', 'SENT', 'ACKNOWLEDGED', 'MISSED', 'ESCALATED', 'CANCELLED'],
    default: 'SCHEDULED'
  },
  reminderSentAt: { type: Date },
  escalatedAt:    { type: Date }
}, { _id: false });

const checkInSchema = new Schema<ICheckIn>({
  userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rideId:           { type: Schema.Types.ObjectId, ref: 'RideLog', index: true },
  title:            { type: String, required: true, trim: true, default: 'Safety Check-In' },
  intervalMinutes:  { type: Number, required: true, min: 5, max: 180, default: 30 },
  totalWindows:     { type: Number, default: 0 },
  completedWindows: { type: Number, default: 0 },
  missedWindows:    { type: Number, default: 0 },
  windows:          [checkInWindowSchema],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'ABORTED'],
    default: 'ACTIVE',
    index: true
  },
  autoEscalateOnMiss:    { type: Boolean, default: true },
  escalationContactCount: { type: Number, default: 0 },
  startedAt: { type: Date, required: true, default: Date.now },
  endedAt:   { type: Date },
  notes:     { type: String, trim: true },
  isSoftDeleted: { type: Boolean, default: false, index: true },
  deletedAt:     { type: Date }
}, { timestamps: true });

checkInSchema.index({ userId: 1, status: 1, isSoftDeleted: 1 });
checkInSchema.index({ 'windows.scheduledAt': 1, 'windows.status': 1 });

export const CheckIn = model<ICheckIn>('CheckIn', checkInSchema);
