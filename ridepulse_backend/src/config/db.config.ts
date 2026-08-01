import mongoose from 'mongoose';
import { env } from './env.config.js';
import { logger } from '../utils/logger.util.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV === 'development',
      serverSelectionTimeoutMS: 5000
    });
    logger.info(`🍃 MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
  } catch (error) {
    logger.error(`❌ MongoDB Connection Failure: ${(error as Error).message}`);
    // Do not exit process in dev to allow offline memory tests
  }
};
