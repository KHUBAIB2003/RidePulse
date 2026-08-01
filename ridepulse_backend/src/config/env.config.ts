import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/ridepulse_dev'),
  JWT_ACCESS_SECRET: z.string().default('dev_access_secret_key_32chars_min'),
  JWT_REFRESH_SECRET: z.string().default('dev_refresh_secret_key_32chars_min'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('*')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment Variable Validation Error:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
