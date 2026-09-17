import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const isDev = config.nodeEnv === 'development';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // Handle system or third-party package errors safely to prevent internal leakage
  console.error('Unhandled Error:', err);

  res.status(500).json({
    status: 'error',
    message: isDev ? err.message : 'Internal server error occurred',
    ...(isDev && { stack: err.stack }),
  });
};
