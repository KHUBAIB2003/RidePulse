import { Schema, model, Document, Types } from 'mongoose';

export type GuardianActivityType =
  | 'INVITATION_SENT'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_REJECTED'
  | 'INVITATION_EXPIRED'
  | 'SESSION_STARTED'
  | 'CHECKIN_ACKNOWLEDGED'
  | 'CHECKIN_MISSED'
  | 'CHECKIN_ESCALATED'
  | 'SESSION_ENDED'
  | 'GUARDIAN_DEACTIVATED'
  | 'GUARDIAN_REACTIVATED'
  | 'PERMISSION_UPDATED'
  | 'PRIORITY_CHANGED'
  | 'SOS_RECOMMENDED';

export interface IGuardianActivity extends Document {
  riderId:         Types.ObjectId;
  guardianUserId?: Types.ObjectId;
  guardianId?:     Types.ObjectId;
  sessionId?:      Types.ObjectId;
  invitationId?:   Types.ObjectId;
  activityType:    GuardianActivityType;
  description:     string;
  performedBy:     'RIDER' | 'GUARDIAN' | 'SYSTEM';
  performedByUserId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const guardianActivitySchema = new Schema<IGuardianActivity>({
  riderId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  guardianUserId:   { type: Schema.Types.ObjectId, ref: 'User', index: true },
  guardianId:       { type: Schema.Types.ObjectId, ref: 'Guardian', index: true },
  sessionId:        { type: Schema.Types.ObjectId, ref: 'GuardianSession', index: true },
  invitationId:     { type: Schema.Types.ObjectId, ref: 'GuardianInvitation', index: true },
  activityType: {
    type: String,
    enum: [
      'INVITATION_SENT',
      'INVITATION_ACCEPTED',
      'INVITATION_REJECTED',
      'INVITATION_EXPIRED',
      'SESSION_STARTED',
      'CHECKIN_ACKNOWLEDGED',
      'CHECKIN_MISSED',
      'CHECKIN_ESCALATED',
      'SESSION_ENDED',
      'GUARDIAN_DEACTIVATED',
      'GUARDIAN_REACTIVATED',
      'PERMISSION_UPDATED',
      'PRIORITY_CHANGED',
      'SOS_RECOMMENDED'
    ],
    required: true,
    index: true
  },
  description:       { type: String, required: true, trim: true },
  performedBy:       { type: String, enum: ['RIDER', 'GUARDIAN', 'SYSTEM'], required: true },
  performedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  metadata:          { type: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

guardianActivitySchema.index({ riderId: 1, createdAt: -1 });
guardianActivitySchema.index({ guardianUserId: 1, createdAt: -1 });

export const GuardianActivity = model<IGuardianActivity>('GuardianActivity', guardianActivitySchema);
