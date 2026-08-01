import { Schema, model, Document, Types } from 'mongoose';

export type GuardianPermission =
  | 'VIEW_LOCATION'
  | 'VIEW_RIDE_STATUS'
  | 'RECEIVE_CHECKIN_ALERTS'
  | 'RECEIVE_CRASH_ALERTS'
  | 'RECEIVE_SOS_ALERTS'
  | 'RECEIVE_INACTIVITY_ALERTS'
  | 'OVERRIDE_CHECKIN';

export interface IGuardian extends Document {
  /** The rider who is being protected */
  riderId: Types.ObjectId;
  /** The user who is acting as guardian */
  guardianUserId: Types.ObjectId;
  /** Cached display name for the guardian */
  guardianDisplayName: string;
  /** Cached callsign for the guardian */
  guardianCallsign: string;
  /** Guardian contact phone (cached at time of invitation) */
  guardianPhone: string;
  /** Rider-assigned label for this guardian */
  label: string;
  /** Guardian priority (1 = first to be notified) */
  priority: number;
  /** Explicit permissions granted to this guardian */
  permissions: GuardianPermission[];
  /** Whether this guardian is currently active */
  isActive: boolean;
  /** How many rides this guardian has monitored */
  totalSessionsMonitored: number;
  /** How many check-ins this guardian has been notified about */
  totalCheckInAlerts: number;
  /** Last time this guardian was notified */
  lastAlertedAt?: Date;
  /** Date the guardian accepted the invitation */
  acceptedAt: Date;
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const guardianSchema = new Schema<IGuardian>({
  riderId:              { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  guardianUserId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  guardianDisplayName:  { type: String, required: true, trim: true },
  guardianCallsign:     { type: String, required: true, trim: true },
  guardianPhone:        { type: String, required: true, trim: true },
  label:                { type: String, required: true, trim: true, default: 'My Guardian' },
  priority:             { type: Number, default: 1, min: 1, max: 10 },
  permissions: {
    type: [String],
    enum: [
      'VIEW_LOCATION',
      'VIEW_RIDE_STATUS',
      'RECEIVE_CHECKIN_ALERTS',
      'RECEIVE_CRASH_ALERTS',
      'RECEIVE_SOS_ALERTS',
      'RECEIVE_INACTIVITY_ALERTS',
      'OVERRIDE_CHECKIN'
    ],
    default: [
      'VIEW_LOCATION',
      'VIEW_RIDE_STATUS',
      'RECEIVE_CHECKIN_ALERTS',
      'RECEIVE_SOS_ALERTS',
      'RECEIVE_CRASH_ALERTS'
    ]
  },
  isActive:               { type: Boolean, default: true, index: true },
  totalSessionsMonitored: { type: Number, default: 0 },
  totalCheckInAlerts:     { type: Number, default: 0 },
  lastAlertedAt:          { type: Date },
  acceptedAt:             { type: Date, required: true, default: Date.now },
  isSoftDeleted:          { type: Boolean, default: false, index: true },
  deletedAt:              { type: Date }
}, { timestamps: true });

// Compound: a user can only be a guardian for a rider once
guardianSchema.index({ riderId: 1, guardianUserId: 1 }, { unique: true });
guardianSchema.index({ riderId: 1, isActive: 1, isSoftDeleted: 1 });
guardianSchema.index({ guardianUserId: 1, isActive: 1, isSoftDeleted: 1 });

export const Guardian = model<IGuardian>('Guardian', guardianSchema);
