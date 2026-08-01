import { Schema, model, Document, Types } from 'mongoose';

export type ReminderType = 
  | 'OIL_CHANGE' 
  | 'CHAIN_SERVICE' 
  | 'BRAKE_INSPECTION' 
  | 'TYRE_CHECK' 
  | 'INSURANCE_EXPIRY' 
  | 'PUC_EXPIRY' 
  | 'REGISTRATION_EXPIRY' 
  | 'CUSTOM';

export interface IReminder extends Document {
  bikeId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  type: ReminderType;
  dueDate?: Date;
  dueOdometerKm?: number;
  isDismissed: boolean;
  isTriggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>({
  bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['OIL_CHANGE', 'CHAIN_SERVICE', 'BRAKE_INSPECTION', 'TYRE_CHECK', 'INSURANCE_EXPIRY', 'PUC_EXPIRY', 'REGISTRATION_EXPIRY', 'CUSTOM'],
    required: true
  },
  dueDate: { type: Date, index: true },
  dueOdometerKm: { type: Number },
  isDismissed: { type: Boolean, default: false, index: true },
  isTriggered: { type: Boolean, default: false, index: true }
}, {
  timestamps: true
});

reminderSchema.index({ userId: 1, isDismissed: 1, dueDate: 1 });

export const Reminder = model<IReminder>('Reminder', reminderSchema);
