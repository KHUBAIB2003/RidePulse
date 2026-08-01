import { z } from 'zod';

export const startRideSchema = z.object({
  bikeId: z.string().min(24, 'Valid bikeId Mongo ObjectId required'),
  title: z.string().min(2).max(100).optional(),
  tags: z.array(z.string()).optional(),
  startLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    altitude: z.number().optional().default(0)
  })
});

export const pauseRideSchema = z.object({
  rideId: z.string().min(24, 'Valid rideId Mongo ObjectId required')
});

export const resumeRideSchema = z.object({
  rideId: z.string().min(24, 'Valid rideId Mongo ObjectId required')
});

export const stopRideSchema = z.object({
  rideId: z.string().min(24, 'Valid rideId Mongo ObjectId required'),
  notes: z.string().max(500).optional(),
  endLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    altitude: z.number().optional().default(0)
  }).optional()
});

export const addLocationSchema = z.object({
  rideId: z.string().min(24, 'Valid rideId Mongo ObjectId required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional().default(0),
  accuracy: z.number().optional().default(0),
  bearing: z.number().optional().default(0),
  speed: z.number().optional().default(0), // in km/h or m/s
  heading: z.number().optional().default(0),
  provider: z.enum(['gps', 'network', 'fused']).optional().default('gps'),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkStatus: z.string().optional(),
  timestamp: z.string().or(z.number()).or(z.date()).optional()
});

export const batchTelemetrySchema = z.object({
  rideId: z.string().min(24, 'Valid rideId Mongo ObjectId required'),
  points: z.array(z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    altitude: z.number().optional().default(0),
    accuracy: z.number().optional().default(0),
    bearing: z.number().optional().default(0),
    speed: z.number().optional().default(0),
    heading: z.number().optional().default(0),
    provider: z.enum(['gps', 'network', 'fused']).optional().default('gps'),
    batteryLevel: z.number().optional(),
    networkStatus: z.string().optional(),
    timestamp: z.string().or(z.number()).or(z.date()).optional()
  })).min(1, 'At least one telemetry point is required')
});

export const queryRidesSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bikeId: z.string().optional(),
  minDistance: z.string().optional(),
  maxDistance: z.string().optional(),
  minDuration: z.string().optional(),
  maxDuration: z.string().optional(),
  minAvgSpeed: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  radiusKm: z.string().optional(),
  tags: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20')
});

export type StartRideInput = z.infer<typeof startRideSchema>;
export type PauseRideInput = z.infer<typeof pauseRideSchema>;
export type ResumeRideInput = z.infer<typeof resumeRideSchema>;
export type StopRideInput = z.infer<typeof stopRideSchema>;
export type AddLocationInput = z.infer<typeof addLocationSchema>;
export type BatchTelemetryInput = z.infer<typeof batchTelemetrySchema>;
export type QueryRidesInput = z.infer<typeof queryRidesSchema>;
