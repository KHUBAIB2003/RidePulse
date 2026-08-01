import { Request, Response, NextFunction } from 'express';

export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const originalWriteHead = res.writeHead;

  res.writeHead = function (this: Response, statusCode: number, ...args: any[]): Response {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    return (originalWriteHead as any).apply(this, [statusCode, ...args]);
  };

  next();
};
