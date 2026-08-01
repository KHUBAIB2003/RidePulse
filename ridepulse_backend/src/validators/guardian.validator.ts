import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Shared Enums
// ──────────────────────────────────────────────────────────────
export const guardianPermissions = [
  'VIEW_LOCATION',
  'VIEW_RIDE_STATUS',
  'RECEIVE_CHECKIN_ALERTS',
  'RECEIVE_CRASH_ALERTS',
  'RECEIVE_SOS_ALERTS',
  'RECEIVE_INACTIVITY_ALERTS',
  'OVERRIDE_CHECKIN'
] as const;

const mongoId = z.string().min(24, 'Valid MongoDB ObjectId required').max(24);

// ──────────────────────────────────────────────────────────────
// POST /guardian/invite
// ──────────────────────────────────────────────────────────────
export const sendInvitationSchema = z.object({
  /** RidePulse callsign or userId of the person to invite */
  inviteeCallsign: z.string().min(2).max(30).trim(),
  label:    z.string().min(1).max(60).trim().default('My Guardian'),
  priority: z.number().int().min(1).max(10).default(1),
  permissions: z
    .array(z.enum(guardianPermissions))
    .min(1)
    .default([
      'VIEW_LOCATION',
      'VIEW_RIDE_STATUS',
      'RECEIVE_CHECKIN_ALERTS',
      'RECEIVE_SOS_ALERTS',
      'RECEIVE_CRASH_ALERTS'
    ]),
  message: z.string().max(500).trim().optional()
});

// ──────────────────────────────────────────────────────────────
// POST /guardian/accept
// ──────────────────────────────────────────────────────────────
export const acceptInvitationSchema = z.object({
  invitationId: mongoId
});

// ──────────────────────────────────────────────────────────────
// POST /guardian/reject
// ──────────────────────────────────────────────────────────────
export const rejectInvitationSchema = z.object({
  invitationId: mongoId,
  reason: z.string().max(300).trim().optional().default('Declined by user')
});

// ──────────────────────────────────────────────────────────────
// POST /guardian/start  – start a monitoring session
// ──────────────────────────────────────────────────────────────
export const startSessionSchema = z.object({
  guardianId:         mongoId,
  rideId:             mongoId.optional(),
  title:              z.string().max(100).trim().optional().default('Guardian Safety Session'),
  intervalMinutes:    z.number().int().min(5).max(180).default(30),
  gracePeriodMinutes: z.number().int().min(1).max(30).default(5),
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});

// ──────────────────────────────────────────────────────────────
// POST /guardian/checkin  – rider manually acknowledges
// ──────────────────────────────────────────────────────────────
export const acknowledgeCheckInSchema = z.object({
  sessionId:   mongoId,
  windowIndex: z.number().int().min(0).optional(),
  latitude:    z.number().min(-90).max(90).optional(),
  longitude:   z.number().min(-180).max(180).optional(),
  note:        z.string().max(200).trim().optional()
});

// ──────────────────────────────────────────────────────────────
// POST /guardian/end  – end monitoring session
// ──────────────────────────────────────────────────────────────
export const endSessionSchema = z.object({
  sessionId: mongoId,
  reason:    z.string().max(300).trim().optional().default('Rider ended session')
});

// ──────────────────────────────────────────────────────────────
// PATCH /guardian/:id  – update guardian settings
// ──────────────────────────────────────────────────────────────
export const updateGuardianSchema = z.object({
  label:       z.string().min(1).max(60).trim().optional(),
  priority:    z.number().int().min(1).max(10).optional(),
  permissions: z.array(z.enum(guardianPermissions)).min(1).optional(),
  isActive:    z.boolean().optional()
});

// ──────────────────────────────────────────────────────────────
// Type Exports
// ──────────────────────────────────────────────────────────────
export type SendInvitationInput      = z.infer<typeof sendInvitationSchema>;
export type AcceptInvitationInput    = z.infer<typeof acceptInvitationSchema>;
export type RejectInvitationInput    = z.infer<typeof rejectInvitationSchema>;
export type StartSessionInput        = z.infer<typeof startSessionSchema>;
export type AcknowledgeCheckInInput  = z.infer<typeof acknowledgeCheckInSchema>;
export type EndSessionInput          = z.infer<typeof endSessionSchema>;
export type UpdateGuardianInput      = z.infer<typeof updateGuardianSchema>;
