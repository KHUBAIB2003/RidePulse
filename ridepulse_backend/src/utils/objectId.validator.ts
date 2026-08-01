import mongoose from 'mongoose';

export const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const validateObjectIdParam = (id: string, paramName: string = 'id'): void => {
  if (!isValidObjectId(id)) {
    throw new Error(`Invalid ${paramName} format. Must be a valid 24-character hex MongoDB ObjectId.`);
  }
};
