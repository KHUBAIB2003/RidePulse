import { Schema, model, Document, Types } from 'mongoose';

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface IHazard extends Document {
  category: 'POTHOLE' | 'DEBRIS' | 'ACCIDENT' | 'SIGNAL_DOWN' | 'ANIMAL';
  note: string;
  reporterUserId: Types.ObjectId;
  reporterCallsign: string;
  location: IGeoPoint;
  geohash: string;
  confirmations: number;
  status: 'ACTIVE' | 'RESOLVED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const geoPointSchema = new Schema<IGeoPoint>({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true } // [longitude, latitude]
}, { _id: false });

const hazardSchema = new Schema<IHazard>({
  category: { 
    type: String, 
    enum: ['POTHOLE', 'DEBRIS', 'ACCIDENT', 'SIGNAL_DOWN', 'ANIMAL'], 
    required: true 
  },
  note: { type: String, required: true, trim: true },
  reporterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reporterCallsign: { type: String, required: true },
  location: { type: geoPointSchema, required: true },
  geohash: { type: String, required: true, index: true },
  confirmations: { type: Number, default: 1 },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED', 'EXPIRED'], default: 'ACTIVE', index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } } // TTL index
}, {
  timestamps: true
});

hazardSchema.index({ location: '2dsphere' });

export const Hazard = model<IHazard>('Hazard', hazardSchema);
