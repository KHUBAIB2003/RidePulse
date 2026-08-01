import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { connectDatabase } from './config/db.config.js';
import { logger } from './utils/logger.util.js';

const startServer = async () => {
  const app = createApp();
  const server = http.createServer(app);

  // Connect to Database
  await connectDatabase();

  server.listen(parseInt(env.PORT), () => {
    logger.info(`🚀 RidePulse v2.0 Backend Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`🔗 Health Check: http://localhost:${env.PORT}/health`);
  });

  // Graceful Shutdown
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
