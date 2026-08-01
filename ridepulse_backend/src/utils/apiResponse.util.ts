import { Response } from 'express';

export interface ApiResponsePayload<T = any> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta: Record<string, any>;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta: Record<string, any> = {}
  ): Response {
    const payload: ApiResponsePayload<T> = {
      success: true,
      data,
      error: null,
      meta: {
        timestamp: Date.now(),
        message,
        ...meta
      }
    };
    return res.status(statusCode).json(payload);
  }

  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    errorCode: string = 'ERROR',
    meta: Record<string, any> = {}
  ): Response {
    const payload: ApiResponsePayload<null> = {
      success: false,
      data: null,
      error: {
        code: errorCode,
        message
      },
      meta: {
        timestamp: Date.now(),
        ...meta
      }
    };
    return res.status(statusCode).json(payload);
  }
}
