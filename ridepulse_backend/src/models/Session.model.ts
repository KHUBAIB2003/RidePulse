import { Schema, model, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  deviceName?: string;
  deviceOs?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActive: Date;
  isCurrentSession?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  deviceName: { type: String, default: 'Unknown Device' },
  deviceOs: { type: String, default: 'Unknown OS' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  lastActive: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

sessionSchema.index({ userId: 1, lastActive: -1 });

export const Session = model<ISession>('Session', sessionSchema);
