import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { logger } from '../utils/logger.util.js';

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: string;
  };
}

export class SocketManager {
  private static instance: SocketManager;
  private io: SocketIOServer | null = null;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  init(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CLIENT_ORIGIN === '*' ? '*' : env.CLIENT_ORIGIN.split(','),
        credentials: true
      },
      pingTimeout: 30000,
      pingInterval: 10000
    });

    this.setupMiddleware();
    this.setupNamespaces();

    logger.info('⚡ Socket.IO Real-Time Engine Initialized');
    return this.io;
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        logger.warn(`[SocketAuth] Connection rejected for socket ${socket.id}: No token provided`);
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string };
        socket.user = decoded;
        next();
      } catch (_err) {
        logger.warn(`[SocketAuth] Connection rejected for socket ${socket.id}: Invalid token`);
        next(new Error('Invalid or expired authentication token'));
      }
    });
  }

  private setupNamespaces(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.user?.userId || 'unknown';
      logger.info(`⚡ Socket Connected: ID=${socket.id}, User=${userId}`);

      socket.join(`room:user:${userId}`);

      socket.on('disconnect', (reason) => {
        logger.info(`🔌 Socket Disconnected: ID=${socket.id}, User=${userId}, Reason=${reason}`);
      });

      socket.on('error', (err) => {
        logger.error(`❌ Socket Error: ID=${socket.id}, Error=${err.message}`);
      });
    });

    const telemetryNs = this.io.of('/telemetry');
    telemetryNs.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`📡 Telemetry Socket Connected: ID=${socket.id}`);
    });

    const sosNs = this.io.of('/sos');
    sosNs.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`🚨 SOS Socket Connected: ID=${socket.id}`);
    });

    const groupsNs = this.io.of('/groups');
    groupsNs.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`👥 Groups Socket Connected: ID=${socket.id}`);
    });
  }

  joinRoom(socketId: string, roomName: string): void {
    const socket = this.io?.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomName);
      logger.info(`[SocketRoom] Socket ${socketId} joined room ${roomName}`);
    }
  }

  leaveRoom(socketId: string, roomName: string): void {
    const socket = this.io?.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomName);
      logger.info(`[SocketRoom] Socket ${socketId} left room ${roomName}`);
    }
  }

  emitToRoom(roomName: string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(roomName).emit(event, payload);
    }
  }

  emitToUser(userId: string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(`room:user:${userId}`).emit(event, payload);
    }
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO instance has not been initialized');
    }
    return this.io;
  }
}
