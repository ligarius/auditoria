import { ZodError, ZodIssue } from 'zod';

export type ValidationIssue = {
  path: string;
  message: string;
  code: ZodIssue['code'];
};

export const formatZodIssues = (error: ZodError): ValidationIssue[] =>
  error.issues.map((issue) => ({
    path: issue.path.join('.') || '<root>',
    message: issue.message,
    code: issue.code,
  }));
