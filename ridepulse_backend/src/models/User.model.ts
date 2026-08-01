import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IEmergencyContact {
  _id?: Types.ObjectId;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number; // 1 = highest
  preferredContactMethod: 'CALL' | 'SMS' | 'WHATSAPP';
  isActive: boolean;
}

export interface INotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  hazardAlerts: boolean;
  guardianCheckinReminders: boolean;
  groupRideInvites: boolean;
}

export interface IPrivacySettings {
  profileVisibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  shareLiveLocation: 'ALWAYS' | 'IN_RIDE_ONLY' | 'NEVER';
  showOnLeaderboard: boolean;
}

export interface IRidePreferences {
  units: 'METRIC' | 'IMPERIAL';
  audioCuesEnabled: boolean;
  autoStartRide: boolean;
  maxLeanAngleThresholdDeg: number;
}

export interface IGuardianSettings {
  autoAlertOnCrash: boolean;
  inactivityTimeoutMinutes: number;
  safetyCheckinIntervalMinutes: number;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  username: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  callsign: string;
  passwordHash: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  timezone: string;
  language: string;
  role: 'RIDER' | 'COMMUNITY_MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  accountStatus: 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'DELETED';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  passwordHistory: string[];
  emergencyContacts: Types.DocumentArray<IEmergencyContact & Document>;
  preferredBikeId?: Types.ObjectId;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  notificationPreferences: INotificationPreferences;
  privacySettings: IPrivacySettings;
  ridePreferences: IRidePreferences;
  guardianSettings: IGuardianSettings;
  lastLogin?: Date;
  lastSeen?: Date;
  isOnline: boolean;
  fcmTokens: string[];
  isSoftDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
}

const emergencyContactSchema = new Schema<IEmergencyContact>({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  priority: { type: Number, default: 1 },
  preferredContactMethod: { type: String, enum: ['CALL', 'SMS', 'WHATSAPP'], default: 'CALL' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  displayName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phoneNumber: { type: String, required: true, unique: true, trim: true, index: true },
  callsign: { type: String, required: true, unique: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], default: 'PREFER_NOT_TO_SAY' },
  country: { type: String, default: 'India' },
  state: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: '' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  language: { type: String, default: 'en' },
  role: { type: String, enum: ['RIDER', 'COMMUNITY_MODERATOR', 'ADMIN', 'SUPER_ADMIN'], default: 'RIDER', index: true },
  accountStatus: { type: String, enum: ['ACTIVE', 'LOCKED', 'SUSPENDED', 'DELETED'], default: 'ACTIVE', index: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationTokenExpires: { type: Date },
  passwordResetToken: { type: String },
  passwordResetTokenExpires: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  passwordHistory: [{ type: String }],
  emergencyContacts: [emergencyContactSchema],
  preferredBikeId: { type: Schema.Types.ObjectId, ref: 'Bike' },
  theme: { type: String, enum: ['LIGHT', 'DARK', 'SYSTEM'], default: 'DARK' },
  notificationPreferences: {
    pushEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: true },
    hazardAlerts: { type: Boolean, default: true },
    guardianCheckinReminders: { type: Boolean, default: true },
    groupRideInvites: { type: Boolean, default: true }
  },
  privacySettings: {
    profileVisibility: { type: String, enum: ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'], default: 'FRIENDS_ONLY' },
    shareLiveLocation: { type: String, enum: ['ALWAYS', 'IN_RIDE_ONLY', 'NEVER'], default: 'IN_RIDE_ONLY' },
    showOnLeaderboard: { type: Boolean, default: true }
  },
  ridePreferences: {
    units: { type: String, enum: ['METRIC', 'IMPERIAL'], default: 'METRIC' },
    audioCuesEnabled: { type: Boolean, default: true },
    autoStartRide: { type: Boolean, default: false },
    maxLeanAngleThresholdDeg: { type: Number, default: 45 }
  },
  guardianSettings: {
    autoAlertOnCrash: { type: Boolean, default: true },
    inactivityTimeoutMinutes: { type: Number, default: 15 },
    safetyCheckinIntervalMinutes: { type: Number, default: 30 }
  },
  lastLogin: { type: Date },
  lastSeen: { type: Date },
  isOnline: { type: Boolean, default: false },
  fcmTokens: [{ type: String }],
  isSoftDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
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

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export const User = model<IUser>('User', userSchema);
