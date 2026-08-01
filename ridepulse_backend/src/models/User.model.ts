import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IEmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
  isPrimary?: boolean;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  phoneNumber: string;
  callsign: string;
  fullName: string;
  role: 'RIDER' | 'COMMUNITY_MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  emergencyContacts: IEmergencyContact[];
  fcmTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const emergencyContactSchema = new Schema<IEmergencyContact>({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  relationship: { type: String, default: 'Contact' },
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new Schema<IUser>({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    index: true 
  },
  passwordHash: { type: String, required: true },
  phoneNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  },
  callsign: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  },
  fullName: { type: String, required: true, trim: true },
  role: { 
    type: String, 
    enum: ['RIDER', 'COMMUNITY_MODERATOR', 'ADMIN', 'SUPER_ADMIN'], 
    default: 'RIDER' 
  },
  emergencyContacts: [emergencyContactSchema],
  fcmTokens: [{ type: String }]
}, {
  timestamps: true
});

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = model<IUser>('User', userSchema);
