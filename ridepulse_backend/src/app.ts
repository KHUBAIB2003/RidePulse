import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.config.js';
import { checkDatabaseHealth } from './config/db.config.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { requestTimingMiddleware } from './middlewares/requestTiming.middleware.js';
import { requestLoggerMiddleware } from './middlewares/requestLogger.middleware.js';
import { ipLoggerMiddleware } from './middlewares/ipLogger.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { setupSwaggerDocs } from './config/swagger.config.js';
import v1Routes from './routes/v1/index.js';
import v2Routes from './routes/v2/index.js';

export const createApp = (): Express => {
  const app: Express = express();

  // Core Request Tracing & Timing
  app.use(requestIdMiddleware);
  app.use(requestTimingMiddleware);
  app.use(ipLoggerMiddleware);
  app.use(requestLoggerMiddleware);

  // Security & Hardening Middlewares
  app.use(helmet());
  app.use(cors({
    origin: env.CLIENT_ORIGIN === '*' ? '*' : env.CLIENT_ORIGIN.split(','),
    credentials: true
  }));
  app.use(compression());
  app.use(hpp());
  app.use(mongoSanitize());

  // Rate Limiting (100 req / 15 min)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } }
  });
  app.use('/api', limiter);

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Swagger Documentation Setup
  setupSwaggerDocs(app);

  // API Route Versioning
  app.use('/api/v1', v1Routes);
  app.use('/api/v2', v2Routes);

  // System Health & Telemetry Endpoint
  app.get('/health', async (req: Request, res: Response) => {
    const dbHealth = await checkDatabaseHealth();
    const isHealthy = dbHealth.status === 'UP';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'UP' : 'DEGRADED',
      service: 'RidePulse Backend API Engine',
      environment: env.NODE_ENV,
      database: dbHealth,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  });

  // Catch-All 404 & Global Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
