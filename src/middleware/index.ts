/**
 * Express Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * Error handler middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[Error] ${req.method} ${req.path}:`, err);
  
  res.status(statusCode).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      details: config.server.isDev ? err.stack : undefined
    }
  });
}

/**
 * Auth stub middleware
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // In a real app, this would verify JWT
  // For now, we'll inject a mock user if not present
  (req as any).user = {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'dev@remy.finance'
  };
  next();
}

/**
 * Request logger middleware
 */
export function logger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
}
