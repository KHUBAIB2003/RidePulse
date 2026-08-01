import { z } from 'zod';

export const sosCategories = [
  'ACCIDENT',
  'MEDICAL_EMERGENCY',
  'BIKE_BREAKDOWN',
  'VEHICLE_THEFT',
  'ROBBERY',
  'MECHANICAL_FAILURE',
  'FIRE',
  'NATURAL_DISASTER',
  'ROAD_RAGE',
  'OTHER'
] as const;

export const sosSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const startSOSSchema = z.object({
  bikeId: z.string().optional(),
  category: z.enum(sosCategories).optional().default('ACCIDENT'),
  severity: z.enum(sosSeverities).optional().default('HIGH'),
  countdownSeconds: z.number().min(0).max(60).optional().default(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional().default(0),
  batteryPercentage: z.number().min(0).max(100).optional().default(100),
  networkType: z.string().optional().default('4G')
});

export const cancelSOSSchema = z.object({
  sosId: z.string().min(24, 'Valid Mongo ObjectId required for sosId'),
  reason: z.string().max(300).optional().default('False alarm by rider')
});

export const triggerSOSSchema = z.object({
  sosId: z.string().min(24, 'Valid Mongo ObjectId required for sosId'),
  category: z.enum(sosCategories).optional(),
  severity: z.enum(sosSeverities).optional(),
  manualNotes: z.string().max(500).optional()
});

export const addSOSLocationSchema = z.object({
  sosId: z.string().min(24, 'Valid Mongo ObjectId required for sosId'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional().default(0),
  accuracy: z.number().optional().default(0),
  bearing: z.number().optional().default(0),
  speed: z.number().optional().default(0),
  heading: z.number().optional().default(0),
  provider: z.string().optional().default('gps'),
  batteryPercentage: z.number().min(0).max(100).optional(),
  networkType: z.string().optional()
});

export const resolveSOSSchema = z.object({
  sosId: z.string().min(24, 'Valid Mongo ObjectId required for sosId'),
  notes: z.string().max(500).optional().default('Incident resolved safely')
});

export const adminCloseSOSSchema = z.object({
  reason: z.string().min(3).max(500).optional().default('Administrative resolution')
});

export const adminEscalateSOSSchema = z.object({
  newSeverity: z.enum(sosSeverities).optional(),
  newEscalationLevel: z.number().min(1).max(5).optional(),
  reason: z.string().min(3).max(500).optional().default('Emergency escalation triggered by safety team')
});

export type StartSOSInput = z.infer<typeof startSOSSchema>;
export type CancelSOSInput = z.infer<typeof cancelSOSSchema>;
export type TriggerSOSInput = z.infer<typeof triggerSOSSchema>;
export type AddSOSLocationInput = z.infer<typeof addSOSLocationSchema>;
export type ResolveSOSInput = z.infer<typeof resolveSOSSchema>;
export type AdminCloseSOSInput = z.infer<typeof adminCloseSOSSchema>;
export type AdminEscalateSOSInput = z.infer<typeof adminEscalateSOSSchema>;
