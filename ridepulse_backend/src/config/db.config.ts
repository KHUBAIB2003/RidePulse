import mongoose from 'mongoose';
import { env } from './env.config.js';
import { logger } from '../utils/logger.util.js';

export interface DatabaseHealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  readyState: number;
  host?: string;
  name?: string;
  pingMs?: number;
}

export const setupDatabaseListeners = (): void => {
  mongoose.connection.on('connected', () => {
    logger.info('🍃 MongoDB Connection Event: Connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`❌ MongoDB Connection Event Error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ MongoDB Connection Event: Disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('🔄 MongoDB Connection Event: Reconnected');
  });
};

export const connectDatabase = async (maxRetries = 5, initialDelayMs = 1000): Promise<boolean> => {
  setupDatabaseListeners();

  let retries = 0;
  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        autoIndex: env.NODE_ENV === 'development',
        serverSelectionTimeoutMS: 5000
      });
      logger.info(`🍃 MongoDB Database Connected: ${conn.connection.host}/${conn.connection.name}`);
      return true;
    } catch (error) {
      retries++;
      const delay = initialDelayMs * Math.pow(2, retries - 1);
      logger.error(`❌ MongoDB Connection Retry ${retries}/${maxRetries} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
      if (retries >= maxRetries) {
        logger.error('💥 All MongoDB connection attempts exhausted.');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

export const checkDatabaseHealth = async (): Promise<DatabaseHealthStatus> => {
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    return {
      status: 'DOWN',
      readyState: state
    };
  }

  const start = Date.now();
  try {
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }
    const pingMs = Date.now() - start;
    return {
      status: 'UP',
      readyState: state,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      pingMs
    };
  } catch (err) {
    return {
      status: 'DEGRADED',
      readyState: state,
      host: mongoose.connection.host
    };
  }
};

export const closeDatabaseConnection = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('🍃 MongoDB connection closed.');
  }
};
