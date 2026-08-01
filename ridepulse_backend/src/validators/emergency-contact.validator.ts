import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Shared Enums
// ──────────────────────────────────────────────────────────────
export const contactRelationships = [
  'SPOUSE', 'PARENT', 'SIBLING', 'CHILD', 'RELATIVE',
  'FRIEND', 'COLLEAGUE', 'PARTNER', 'GUARDIAN',
  'DOCTOR', 'MECHANIC', 'OTHER'
] as const;

export const notificationChannels = [
  'PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'CALL'
] as const;

export const availabilityStatuses = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] as const;

const mongoId = z.string().length(24, 'Valid MongoDB ObjectId required');

// ──────────────────────────────────────────────────────────────
// Channel preference sub-object
// ──────────────────────────────────────────────────────────────
const channelPreferenceSchema = z.object({
  channel:  z.enum(notificationChannels),
  enabled:  z.boolean().default(true),
  address:  z.string().max(200).optional()
});

// ──────────────────────────────────────────────────────────────
// POST /emergency-contacts  — create
// ──────────────────────────────────────────────────────────────
export const createContactSchema = z.object({
  name:         z.string().min(2).max(100).trim(),
  relationship: z.enum(contactRelationships).default('OTHER'),
  phone:        z.string().min(7).max(20).trim(),
  countryCode:  z.string().min(1).max(5).trim().default('+91'),
  email:        z.string().email().toLowerCase().trim().optional(),
  avatarColor:  z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  priority:     z.number().int().min(1).max(20).default(1),
  isPrimary:    z.boolean().default(false),
  isFavourite:  z.boolean().default(false),
  availabilityStatus: z.enum(availabilityStatuses).default('AVAILABLE'),
  channelPreferences: z.array(channelPreferenceSchema).max(5).optional(),
  notes:        z.string().max(500).trim().optional()
});

// ──────────────────────────────────────────────────────────────
// PUT /emergency-contacts/:id  — full update
// ──────────────────────────────────────────────────────────────
export const updateContactSchema = z.object({
  name:         z.string().min(2).max(100).trim().optional(),
  relationship: z.enum(contactRelationships).optional(),
  phone:        z.string().min(7).max(20).trim().optional(),
  countryCode:  z.string().min(1).max(5).trim().optional(),
  email:        z.string().email().toLowerCase().trim().optional(),
  avatarColor:  z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  priority:     z.number().int().min(1).max(20).optional(),
  isFavourite:  z.boolean().optional(),
  availabilityStatus: z.enum(availabilityStatuses).optional(),
  channelPreferences: z.array(channelPreferenceSchema).max(5).optional(),
  notes:        z.string().max(500).trim().optional(),
  isActive:     z.boolean().optional()
});

// ──────────────────────────────────────────────────────────────
// POST /emergency-contacts/invite
// ──────────────────────────────────────────────────────────────
export const sendInviteSchema = z.object({
  emergencyContactId: mongoId,
  message:            z.string().max(500).trim().optional()
});

// ──────────────────────────────────────────────────────────────
// POST /emergency-contacts/accept
// ──────────────────────────────────────────────────────────────
export const acceptInviteSchema = z.object({
  invitationId: mongoId
});

// ──────────────────────────────────────────────────────────────
// POST /emergency-contacts/reject
// ──────────────────────────────────────────────────────────────
export const rejectInviteSchema = z.object({
  invitationId: mongoId,
  reason:       z.string().max(300).trim().optional().default('Declined by contact')
});

// ──────────────────────────────────────────────────────────────
// PATCH /emergency-contacts/:id/primary
// ──────────────────────────────────────────────────────────────
export const setPrimarySchema = z.object({
  contactId: mongoId.optional() // can also come from req.params
});

// ──────────────────────────────────────────────────────────────
// Query Params
// ──────────────────────────────────────────────────────────────
export const listContactsQuerySchema = z.object({
  isActive:     z.enum(['true', 'false']).optional(),
  isPrimary:    z.enum(['true', 'false']).optional(),
  isFavourite:  z.enum(['true', 'false']).optional(),
  relationship: z.enum(contactRelationships).optional(),
  limit:        z.string().regex(/^\d+$/).optional().default('50'),
  skip:         z.string().regex(/^\d+$/).optional().default('0')
});

// ──────────────────────────────────────────────────────────────
// Type Exports
// ──────────────────────────────────────────────────────────────
export type CreateContactInput    = z.infer<typeof createContactSchema>;
export type UpdateContactInput    = z.infer<typeof updateContactSchema>;
export type SendInviteInput       = z.infer<typeof sendInviteSchema>;
export type AcceptInviteInput     = z.infer<typeof acceptInviteSchema>;
export type RejectInviteInput     = z.infer<typeof rejectInviteSchema>;
export type ListContactsQuery     = z.infer<typeof listContactsQuerySchema>;
