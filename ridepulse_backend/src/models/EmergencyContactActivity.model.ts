import { Schema, model, Document, Types } from 'mongoose';

export type ECActivityType =
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_DELETED'
  | 'CONTACT_RESTORED'
  | 'PRIMARY_SET'
  | 'PRIMARY_CLEARED'
  | 'FAVOURITE_TOGGLED'
  | 'AVAILABILITY_CHANGED'
  | 'VERIFICATION_INITIATED'
  | 'VERIFICATION_COMPLETED'
  | 'VERIFICATION_FAILED'
  | 'INVITATION_SENT'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_REJECTED'
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_DELIVERED'
  | 'NOTIFICATION_FAILED'
  | 'PRIORITY_CHANGED'
  | 'CHANNEL_UPDATED';

export interface IEmergencyContactActivity extends Document {
  ownerId:            Types.ObjectId;
  emergencyContactId: Types.ObjectId;
  activityType:       ECActivityType;
  description:        string;
  performedBy:        'USER' | 'SYSTEM' | 'CONTACT';
  performedByUserId?: Types.ObjectId;
  metadata?:          Record<string, unknown>;
  ipAddress?:         string;
  createdAt:          Date;
}

const emergencyContactActivitySchema = new Schema<IEmergencyContactActivity>({
  ownerId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  emergencyContactId: { type: Schema.Types.ObjectId, ref: 'EmergencyContact', required: true, index: true },
  activityType: {
    type: String,
    enum: [
      'CONTACT_CREATED', 'CONTACT_UPDATED', 'CONTACT_DELETED', 'CONTACT_RESTORED',
      'PRIMARY_SET', 'PRIMARY_CLEARED', 'FAVOURITE_TOGGLED', 'AVAILABILITY_CHANGED',
      'VERIFICATION_INITIATED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED',
      'INVITATION_SENT', 'INVITATION_ACCEPTED', 'INVITATION_REJECTED',
      'NOTIFICATION_SENT', 'NOTIFICATION_DELIVERED', 'NOTIFICATION_FAILED',
      'PRIORITY_CHANGED', 'CHANNEL_UPDATED'
    ],
    required: true,
    index: true
  },
  description:        { type: String, required: true, trim: true },
  performedBy:        { type: String, enum: ['USER', 'SYSTEM', 'CONTACT'], required: true },
  performedByUserId:  { type: Schema.Types.ObjectId, ref: 'User' },
  metadata:           { type: Schema.Types.Mixed },
  ipAddress:          { type: String }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

emergencyContactActivitySchema.index({ ownerId: 1, createdAt: -1 });
emergencyContactActivitySchema.index({ emergencyContactId: 1, createdAt: -1 });
emergencyContactActivitySchema.index({ ownerId: 1, activityType: 1 });

export const EmergencyContactActivity = model<IEmergencyContactActivity>(
  'EmergencyContactActivity',
  emergencyContactActivitySchema
);
