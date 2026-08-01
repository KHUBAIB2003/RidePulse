import { Schema, model, Document, Types } from 'mongoose';
import type { NotificationChannel } from './EmergencyContact.model.js';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface IEmergencyContactInvitation extends Document {
  /** Rider who created this contact record and sent the invitation */
  ownerId:          Types.ObjectId;
  ownerDisplayName: string;
  ownerCallsign:    string;

  /** Contact's details as entered by the owner */
  contactName: string;
  contactPhone: string;
  contactEmail?: string;

  /** The RidePulse userId of the invitee (if they have an account) */
  inviteeUserId?: Types.ObjectId;

  /** The EmergencyContact record this invitation is for */
  emergencyContactId: Types.ObjectId;

  /** Rider-specified relationship label */
  relationship: string;

  /** Preferred channels the owner wants to use */
  requestedChannels: NotificationChannel[];

  /** Personal message */
  message?: string;

  status: InvitationStatus;

  /** One-time acceptance token */
  token:          string;
  tokenExpiresAt: Date;

  respondedAt?:    Date;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactInvitationSchema = new Schema<IEmergencyContactInvitation>({
  ownerId:           { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerDisplayName:  { type: String, required: true, trim: true },
  ownerCallsign:     { type: String, required: true, trim: true },

  contactName:   { type: String, required: true, trim: true },
  contactPhone:  { type: String, required: true, trim: true },
  contactEmail:  { type: String, lowercase: true, trim: true },

  inviteeUserId:      { type: Schema.Types.ObjectId, ref: 'User', index: true },
  emergencyContactId: { type: Schema.Types.ObjectId, ref: 'EmergencyContact', required: true, index: true },

  relationship: { type: String, required: true, trim: true },

  requestedChannels: {
    type: [String],
    enum: ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'CALL'],
    default: ['SMS', 'CALL']
  },

  message: { type: String, trim: true, maxlength: 500 },

  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },

  token:          { type: String, required: true, index: true },
  tokenExpiresAt: { type: Date, required: true },

  respondedAt:     { type: Date },
  rejectionReason: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true });

// TTL: auto-expire document after tokenExpiresAt
emergencyContactInvitationSchema.index({ tokenExpiresAt: 1 }, { expireAfterSeconds: 0 });
emergencyContactInvitationSchema.index({ ownerId: 1, status: 1 });

export const EmergencyContactInvitation = model<IEmergencyContactInvitation>(
  'EmergencyContactInvitation',
  emergencyContactInvitationSchema
);
