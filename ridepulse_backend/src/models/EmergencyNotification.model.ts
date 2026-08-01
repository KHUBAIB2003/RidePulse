import { Schema, model, Document, Types } from 'mongoose';
import type { NotificationChannel } from './EmergencyContact.model.js';

export type EmergencyNotificationStatus =
  | 'QUEUED'
  | 'DISPATCHING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING'
  | 'EXHAUSTED';

export type EmergencyNotificationTrigger =
  | 'SOS_TRIGGERED'
  | 'CRASH_DETECTED'
  | 'GUARDIAN_STAGE3'
  | 'MANUAL_ALERT'
  | 'RIDE_OVERDUE'
  | 'INACTIVITY_TIMEOUT';

export interface IChannelAttempt {
  channel:    NotificationChannel;
  address:    string;
  status:     'SENT' | 'DELIVERED' | 'FAILED';
  attemptedAt: Date;
  messageId?:  string;
  error?:      string;
}

export interface IEmergencyNotification extends Document {
  ownerId:            Types.ObjectId;
  emergencyContactId: Types.ObjectId;
  trigger:            EmergencyNotificationTrigger;
  sosIncidentId?:     Types.ObjectId;
  guardianSessionId?: Types.ObjectId;
  rideId?:            Types.ObjectId;

  /** Pre-rendered message body */
  messageBody:  string;
  messageTitle: string;

  /** All channel attempts in priority order */
  channelAttempts: IChannelAttempt[];

  totalAttempts:   number;
  successfulChannels: NotificationChannel[];

  status: EmergencyNotificationStatus;

  dispatchedAt?: Date;
  deliveredAt?:  Date;
  exhaustedAt?:  Date;

  /** Retry after this time */
  nextRetryAt?: Date;
  retryCount:   number;
  maxRetries:   number;

  createdAt: Date;
  updatedAt: Date;
}

const channelAttemptSchema = new Schema<IChannelAttempt>({
  channel:     { type: String, enum: ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'CALL'], required: true },
  address:     { type: String, required: true },
  status:      { type: String, enum: ['SENT', 'DELIVERED', 'FAILED'], default: 'SENT' },
  attemptedAt: { type: Date, required: true, default: Date.now },
  messageId:   { type: String },
  error:       { type: String }
}, { _id: false });

const emergencyNotificationSchema = new Schema<IEmergencyNotification>({
  ownerId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  emergencyContactId: { type: Schema.Types.ObjectId, ref: 'EmergencyContact', required: true, index: true },
  trigger: {
    type: String,
    enum: [
      'SOS_TRIGGERED', 'CRASH_DETECTED', 'GUARDIAN_STAGE3',
      'MANUAL_ALERT', 'RIDE_OVERDUE', 'INACTIVITY_TIMEOUT'
    ],
    required: true,
    index: true
  },
  sosIncidentId:     { type: Schema.Types.ObjectId, ref: 'SOSIncident', index: true },
  guardianSessionId: { type: Schema.Types.ObjectId, ref: 'GuardianSession', index: true },
  rideId:            { type: Schema.Types.ObjectId, ref: 'RideLog', index: true },

  messageBody:  { type: String, required: true },
  messageTitle: { type: String, required: true },

  channelAttempts:    [channelAttemptSchema],
  totalAttempts:      { type: Number, default: 0 },
  successfulChannels: {
    type: [String],
    enum: ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'CALL'],
    default: []
  },

  status: {
    type: String,
    enum: ['QUEUED', 'DISPATCHING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'EXHAUSTED'],
    default: 'QUEUED',
    index: true
  },

  dispatchedAt: { type: Date },
  deliveredAt:  { type: Date },
  exhaustedAt:  { type: Date },

  nextRetryAt: { type: Date },
  retryCount:  { type: Number, default: 0 },
  maxRetries:  { type: Number, default: 3 }
}, { timestamps: true });

emergencyNotificationSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
emergencyNotificationSchema.index({ emergencyContactId: 1, trigger: 1, createdAt: -1 });

export const EmergencyNotification = model<IEmergencyNotification>(
  'EmergencyNotification',
  emergencyNotificationSchema
);
