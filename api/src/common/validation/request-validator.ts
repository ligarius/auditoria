import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

export type RequestValidationSchema = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

const parsePart = (schema: ZodTypeAny | undefined, value: unknown) =>
  schema ? schema.parse(value) : value;

export const validateRequest = (schemas: RequestValidationSchema): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = parsePart(schemas.body, req.body);
      }
      if (schemas.params) {
        req.params = parsePart(schemas.params, req.params);
      }
      if (schemas.query) {
        req.query = parsePart(schemas.query, req.query);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
