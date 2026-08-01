import { Schema, model, Document, Types } from 'mongoose';
import type { GuardianPermission } from './Guardian.model.js';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface IGuardianInvitation extends Document {
  /** Rider who sent this invitation */
  riderId: Types.ObjectId;
  /** Rider's display info (cached) */
  riderDisplayName: string;
  riderCallsign: string;
  /** The target user being invited as guardian (must have a RidePulse account) */
  inviteeUserId: Types.ObjectId;
  inviteeDisplayName: string;
  inviteeCallsign: string;
  /** Rider-assigned label for this guardian slot */
  label: string;
  /** Desired priority for this guardian */
  priority: number;
  /** Permissions to grant upon acceptance */
  requestedPermissions: GuardianPermission[];
  /** Personal message from rider to the invitee */
  message?: string;
  status: InvitationStatus;
  /** One-time acceptance token */
  token: string;
  tokenExpiresAt: Date;
  respondedAt?: Date;
  rejectionReason?: string;
  /** Reference to the created Guardian doc (set when accepted) */
  resultingGuardianId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const guardianInvitationSchema = new Schema<IGuardianInvitation>({
  riderId:           { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  riderDisplayName:  { type: String, required: true, trim: true },
  riderCallsign:     { type: String, required: true, trim: true },
  inviteeUserId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  inviteeDisplayName: { type: String, required: true, trim: true },
  inviteeCallsign:   { type: String, required: true, trim: true },
  label:             { type: String, required: true, trim: true, default: 'My Guardian' },
  priority:          { type: Number, default: 1, min: 1, max: 10 },
  requestedPermissions: {
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
  message:  { type: String, trim: true, maxlength: 500 },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  token:          { type: String, required: true, index: true },
  tokenExpiresAt: { type: Date, required: true },
  respondedAt:    { type: Date },
  rejectionReason: { type: String, trim: true, maxlength: 300 },
  resultingGuardianId: { type: Schema.Types.ObjectId, ref: 'Guardian' }
}, { timestamps: true });

guardianInvitationSchema.index({ riderId: 1, inviteeUserId: 1, status: 1 });
guardianInvitationSchema.index({ tokenExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

export const GuardianInvitation = model<IGuardianInvitation>(
  'GuardianInvitation',
  guardianInvitationSchema
);
