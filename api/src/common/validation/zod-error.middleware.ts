import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { formatZodIssues } from './helpers';

export const zodErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!(err instanceof ZodError)) {
    next(err);
    return;
  }

  const problem = {
    type: 'https://httpstatuses.com/422',
    title: 'Unprocessable Entity',
    status: 422,
    detail: 'La solicitud contiene datos inválidos.',
    errors: formatZodIssues(err),
    ...(req.id ? { instance: req.id } : {})
  } as const;

  res.status(422).json(problem);
};
