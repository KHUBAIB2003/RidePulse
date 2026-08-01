import { Schema, model, Document, Types } from 'mongoose';

export type ContactVerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED';
export type ContactRelationship =
  | 'SPOUSE'
  | 'PARENT'
  | 'SIBLING'
  | 'CHILD'
  | 'FRIEND'
  | 'COLLEAGUE'
  | 'PARTNER'
  | 'GUARDIAN'
  | 'OTHER';

export interface IContactNotificationLog {
  event: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt: Date;
  messageId?: string;
  responseCode?: string;
}

export interface IEmergencyContactRecord extends Document {
  ownerId: Types.ObjectId;
  name: string;
  relationship: ContactRelationship;
  phone: string;
  email?: string;
  priority: number;
  preferredChannel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
  alternateChannel?: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
  isActive: boolean;
  verificationStatus: ContactVerificationStatus;
  verificationCode?: string;
  verificationExpires?: Date;
  verifiedAt?: Date;
  notificationLog: IContactNotificationLog[];
  totalAlertsReceived: number;
  totalAlertsSent: number;
  lastContactedAt?: Date;
  notes?: string;
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationLogSchema = new Schema<IContactNotificationLog>({
  event:       { type: String, required: true },
  channel:     { type: String, enum: ['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'], required: true },
  status:      { type: String, enum: ['SENT', 'DELIVERED', 'FAILED'], default: 'SENT' },
  sentAt:      { type: Date, required: true, default: Date.now },
  messageId:   { type: String },
  responseCode: { type: String }
}, { _id: false });

const emergencyContactRecordSchema = new Schema<IEmergencyContactRecord>({
  ownerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:         { type: String, required: true, trim: true },
  relationship: {
    type: String,
    enum: ['SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'FRIEND', 'COLLEAGUE', 'PARTNER', 'GUARDIAN', 'OTHER'],
    default: 'OTHER'
  },
  phone:    { type: String, required: true, trim: true },
  email:    { type: String, lowercase: true, trim: true },
  priority: { type: Number, default: 1, min: 1, max: 10 },
  preferredChannel:  { type: String, enum: ['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'], default: 'SMS' },
  alternateChannel:  { type: String, enum: ['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'] },
  isActive:          { type: Boolean, default: true, index: true },
  verificationStatus: {
    type: String,
    enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED'],
    default: 'UNVERIFIED',
    index: true
  },
  verificationCode:    { type: String, select: false },
  verificationExpires: { type: Date },
  verifiedAt:          { type: Date },
  notificationLog:     [notificationLogSchema],
  totalAlertsReceived: { type: Number, default: 0 },
  totalAlertsSent:     { type: Number, default: 0 },
  lastContactedAt:     { type: Date },
  notes:               { type: String, trim: true },
  isSoftDeleted:       { type: Boolean, default: false, index: true },
  deletedAt:           { type: Date }
}, { timestamps: true });

emergencyContactRecordSchema.index({ ownerId: 1, isSoftDeleted: 1, isActive: 1 });
emergencyContactRecordSchema.index({ ownerId: 1, priority: 1 });

export const EmergencyContactRecord = model<IEmergencyContactRecord>(
  'EmergencyContactRecord',
  emergencyContactRecordSchema
);
