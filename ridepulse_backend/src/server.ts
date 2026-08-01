import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { connectDatabase, closeDatabaseConnection } from './config/db.config.js';
import { SocketManager } from './sockets/socket.manager.js';
import { logger } from './utils/logger.util.js';

const startServer = async (): Promise<void> => {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO Real-Time Engine
  const socketManager = SocketManager.getInstance();
  socketManager.init(server);

  // Connect to Database
  await connectDatabase();

  server.listen(parseInt(env.PORT, 10), () => {
    logger.info(`🚀 RidePulse v2.0 Backend Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`🔗 Health Check: http://localhost:${env.PORT}/health`);
    logger.info(`📚 Swagger OpenAPI Specs: http://localhost:${env.PORT}/api/docs`);
  });

  // Graceful Shutdown Handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    
    server.close(async () => {
      logger.info('HTTP & Socket.IO server closed.');
      await closeDatabaseConnection();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    });

    // Forced shutdown fallback if hanging
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
