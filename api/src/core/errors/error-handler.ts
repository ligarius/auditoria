import { NextFunction, Request, Response } from 'express';

import { logger } from '../config/logger.js';
import { HttpError } from './http-error.js';

const buildProblemDetails = (
  status: number,
  title: string,
  detail: unknown,
  instance?: string,
) => ({
  type: `https://httpstatuses.com/${status}`,
  title,
  status,
  detail: detail ?? null,
  ...(instance ? { instance } : {}),
});

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestWithId = req as Request & { id?: string };
  const requestId = requestWithId.id;

  if (err instanceof HttpError) {
    logger.warn({ err }, 'Handled error');
    const detail = err.details ?? err.message;
    const problem = buildProblemDetails(err.status, err.message, detail, requestId);
    return res.status(err.status).json(problem);
  }

  logger.error({ err }, 'Unhandled error');
  const problem = buildProblemDetails(500, 'Internal Server Error', 'An unexpected error occurred', requestId);
  return res.status(500).json(problem);
};
