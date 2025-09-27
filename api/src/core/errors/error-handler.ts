import { NextFunction, Request, Response } from 'express';

import { logger } from '../config/logger.js';
import { HttpError } from './http-error.js';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    logger.warn({ err }, 'Handled error');
    return res.status(err.status).json({
      type: 'https://httpstatuses.com/' + err.status,
      title: err.message,
      status: err.status,
      detail: err.details ?? null
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    type: 'https://httpstatuses.com/500',
    title: 'Error interno',
    status: 500
  });
};
