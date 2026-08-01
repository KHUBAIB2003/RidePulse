import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.config.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import authRoutes from './routes/auth.routes.js';

export const createApp = (): Application => {
  const app: Application = express();

  // Security Middleware
  app.use(helmet());
  app.use(cors({
    origin: env.CLIENT_ORIGIN === '*' ? '*' : env.CLIENT_ORIGIN.split(','),
    credentials: true
  }));
  app.use(mongoSanitize());

  // Rate Limiting (100 req / 15 min)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } }
  });
  app.use('/api', limiter);

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/v1/auth', authRoutes);

  // Health Check Endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'RidePulse Backend API Engine',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
