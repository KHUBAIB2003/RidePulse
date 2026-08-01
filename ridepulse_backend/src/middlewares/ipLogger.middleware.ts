import { Request, Response, NextFunction } from 'express';

export interface RequestWithIp extends Request {
  clientIp?: string;
}

export const ipLoggerMiddleware = (req: RequestWithIp, res: Response, next: NextFunction): void => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || req.ip;
  req.clientIp = ip;
  next();
};
