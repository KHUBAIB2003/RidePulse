import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  deviceId: { type: String, default: 'default_device' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  isRevoked: { type: Boolean, default: false, index: true },
  replacedByTokenHash: { type: String }
}, {
  timestamps: true
});

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
