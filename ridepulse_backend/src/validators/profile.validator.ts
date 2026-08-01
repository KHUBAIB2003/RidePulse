import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  callsign: z.string().min(3).max(20).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional()
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  notificationPreferences: z.object({
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    hazardAlerts: z.boolean().optional(),
    guardianCheckinReminders: z.boolean().optional(),
    groupRideInvites: z.boolean().optional()
  }).optional(),
  privacySettings: z.object({
    profileVisibility: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
    shareLiveLocation: z.enum(['ALWAYS', 'IN_RIDE_ONLY', 'NEVER']).optional(),
    showOnLeaderboard: z.boolean().optional()
  }).optional(),
  ridePreferences: z.object({
    units: z.enum(['METRIC', 'IMPERIAL']).optional(),
    audioCuesEnabled: z.boolean().optional(),
    autoStartRide: z.boolean().optional(),
    maxLeanAngleThresholdDeg: z.number().optional()
  }).optional()
});

export const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  priority: z.number().min(1).default(1),
  preferredContactMethod: z.enum(['CALL', 'SMS', 'WHATSAPP']).default('CALL'),
  isActive: z.boolean().default(true)
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
