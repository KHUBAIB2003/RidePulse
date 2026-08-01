import { Schema, model, Document, Types } from 'mongoose';

export type ExpenseCategory = 
  | 'FUEL' 
  | 'SERVICE' 
  | 'REPAIR' 
  | 'INSURANCE' 
  | 'ACCESSORIES' 
  | 'PARKING' 
  | 'TOLLS' 
  | 'OTHER';

export interface IExpense extends Document {
  bikeId: Types.ObjectId;
  userId: Types.ObjectId;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: Date;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>({
  bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { 
    type: String, 
    enum: ['FUEL', 'SERVICE', 'REPAIR', 'INSURANCE', 'ACCESSORIES', 'PARKING', 'TOLLS', 'OTHER'],
    required: true,
    index: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  expenseDate: { type: Date, required: true, default: Date.now, index: true },
  receiptUrl: { type: String, default: '' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

expenseSchema.index({ bikeId: 1, expenseDate: -1 });

export const Expense = model<IExpense>('Expense', expenseSchema);
