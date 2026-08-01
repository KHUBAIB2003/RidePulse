import { Schema, model, Document, Types } from 'mongoose';

// ──────────────────────────────────────────────────────────────
// Shared Types
// ──────────────────────────────────────────────────────────────
export type ContactVerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED';

export type ContactRelationship =
  | 'SPOUSE'
  | 'PARENT'
  | 'SIBLING'
  | 'CHILD'
  | 'RELATIVE'
  | 'FRIEND'
  | 'COLLEAGUE'
  | 'PARTNER'
  | 'GUARDIAN'
  | 'DOCTOR'
  | 'MECHANIC'
  | 'OTHER';

export type NotificationChannel = 'PUSH' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'CALL';

// ──────────────────────────────────────────────────────────────
// Sub-document: per-channel notification preference
// ──────────────────────────────────────────────────────────────
export interface IChannelPreference {
  channel: NotificationChannel;
  enabled: boolean;
  /** Channel-specific address (phone / email / push token) */
  address?: string;
}

// ──────────────────────────────────────────────────────────────
// Sub-document: compact notification log entry
// ──────────────────────────────────────────────────────────────
export interface IContactNotificationLog {
  event: string;
  channel: NotificationChannel;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING';
  sentAt: Date;
  attempt: number;
  messageId?: string;
  responseCode?: string;
  errorMessage?: string;
}

// ──────────────────────────────────────────────────────────────
// Main Interface
// ──────────────────────────────────────────────────────────────
export interface IEmergencyContact extends Document {
  ownerId:      Types.ObjectId;
  name:         string;
  relationship: ContactRelationship;

  /** E.164 formatted phone number */
  phone:        string;
  countryCode:  string;
  email?:       string;

  /** Display avatar or initials color */
  avatarColor?: string;

  /** 1 = first to be notified */
  priority: number;

  /** Exactly one primary contact per user */
  isPrimary: boolean;

  /** Favourite flag for quick access */
  isFavourite: boolean;

  /** Whether this contact is available (user-toggled) */
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

  /** Ordered list of channels to try */
  channelPreferences: IChannelPreference[];

  isActive: boolean;

  verificationStatus: ContactVerificationStatus;
  /** OTP stored hashed, hidden from queries */
  verificationCode?:    string;
  verificationExpires?: Date;
  verifiedAt?:          Date;

  /** Last 50 notification log entries */
  notificationLog: IContactNotificationLog[];

  totalAlertsSent:     number;
  totalAlertsDelivered: number;
  totalAlertsFailed:   number;
  lastContactedAt?:    Date;

  /** Free-form note from owner */
  notes?: string;

  isSoftDeleted: boolean;
  deletedAt?:    Date;
  createdAt:     Date;
  updatedAt:     Date;
}

// ──────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────
const channelPreferenceSchema = new Schema<IChannelPreference>({
  channel: {
    type: String,
    enum: ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'CALL'],
    required: true
  },
  enabled: { type: Boolean, default: true },
  address: { type: String, trim: true }
}, { _id: false });

const notificationLogSchema = new Schema<IContactNotificationLog>({
  event:        { type: String, required: true },
  channel:      { type: String, enum: ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'CALL'], required: true },
  status:       { type: String, enum: ['SENT', 'DELIVERED', 'FAILED', 'RETRYING'], default: 'SENT' },
  sentAt:       { type: Date, required: true, default: Date.now },
  attempt:      { type: Number, default: 1 },
  messageId:    { type: String },
  responseCode: { type: String },
  errorMessage: { type: String }
}, { _id: false });

const emergencyContactSchema = new Schema<IEmergencyContact>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  name:         { type: String, required: true, trim: true, maxlength: 100 },
  relationship: {
    type: String,
    enum: [
      'SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'RELATIVE',
      'FRIEND', 'COLLEAGUE', 'PARTNER', 'GUARDIAN',
      'DOCTOR', 'MECHANIC', 'OTHER'
    ],
    default: 'OTHER'
  },

  phone:       { type: String, required: true, trim: true },
  countryCode: { type: String, required: true, trim: true, default: '+91' },
  email:       { type: String, lowercase: true, trim: true },
  avatarColor: { type: String, default: '#E53935' },

  priority:    { type: Number, default: 1, min: 1, max: 20 },
  isPrimary:   { type: Boolean, default: false, index: true },
  isFavourite: { type: Boolean, default: false },

  availabilityStatus: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'],
    default: 'AVAILABLE',
    index: true
  },

  channelPreferences: {
    type: [channelPreferenceSchema],
    default: [
      { channel: 'SMS',      enabled: true },
      { channel: 'CALL',     enabled: true },
      { channel: 'WHATSAPP', enabled: false },
      { channel: 'EMAIL',    enabled: false },
      { channel: 'PUSH',     enabled: false }
    ]
  },

  isActive: { type: Boolean, default: true, index: true },

  verificationStatus: {
    type: String,
    enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED'],
    default: 'UNVERIFIED',
    index: true
  },
  verificationCode:    { type: String, select: false },
  verificationExpires: { type: Date },
  verifiedAt:          { type: Date },

  notificationLog: {
    type: [notificationLogSchema],
    default: []
  },

  totalAlertsSent:      { type: Number, default: 0 },
  totalAlertsDelivered: { type: Number, default: 0 },
  totalAlertsFailed:    { type: Number, default: 0 },
  lastContactedAt:      { type: Date },

  notes: { type: String, trim: true, maxlength: 500 },

  isSoftDeleted: { type: Boolean, default: false, index: true },
  deletedAt:     { type: Date }
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────
emergencyContactSchema.index({ ownerId: 1, isSoftDeleted: 1, isActive: 1 });
emergencyContactSchema.index({ ownerId: 1, priority: 1 });
emergencyContactSchema.index({ ownerId: 1, phone: 1 }, { unique: true, partialFilterExpression: { isSoftDeleted: false } });
emergencyContactSchema.index({ ownerId: 1, isPrimary: 1 });

export const EmergencyContact = model<IEmergencyContact>('EmergencyContact', emergencyContactSchema);

// ── Backward-compat alias (EmergencyContactRecord is the old name) ──
export { EmergencyContact as EmergencyContactRecord };
