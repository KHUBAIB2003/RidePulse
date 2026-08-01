import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  callsign: z.string().min(3, 'Callsign must be at least 3 characters').max(20, 'Callsign max 20 characters'),
  fullName: z.string().min(2, 'Full name is required')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
