import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema, ZodTypeAny } from 'zod';

import { HttpError } from '../core/errors/http-error.js';

const parseOrThrow = <T extends ZodTypeAny>(schema: T, data: unknown) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(422, 'Validación fallida', result.error);
  }
  return result.data;
};

export const validateBody = <T extends ZodSchema>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = parseOrThrow(schema, req.body);
    next();
  };
};

export const validateQuery = <T extends ZodSchema>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = parseOrThrow(schema, req.query);
    next();
  };
};

export const validateParams = <T extends ZodSchema>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.params = parseOrThrow(schema, req.params);
    next();
  };
};
