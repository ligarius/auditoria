import 'dotenv/config';
import cors from 'cors';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import 'express-async-errors';
import pino from 'pino';
import type { IncomingHttpHeaders } from 'http';

import { appRouter } from './app.js';
import { env } from './core/config/env.js';
import { metricsRegistry } from './core/metrics/registry.js';
import { globalRateLimiter } from './core/middleware/rate-limit.js';
import { errorHandler } from './core/errors/error-handler.js';
import { logger } from './core/config/logger.js';
import { findingRouter } from './modules/findings/finding.router.js';
import { riskRouter } from './modules/risks/risk.router.js';
import { formsRouter } from './modules/forms/forms.router.js';
import workflowRouter from './modules/workflow/workflow.router.js';
import reportRouter from './modules/export/report.router.js';
import { initializeQueueWorkers } from './services/queue.js';
import surveysRouter from './routes/surveys.js';
import { zodErrorHandler } from './common/validation/zod-error.middleware.js';

const app = express();

if (env.nodeEnv === 'development') {
  app.set('etag', false);
  app.use((_, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
}

const allowedOrigins = env.clientUrl
  ? Array.from(new Set([env.clientUrl, ...env.corsAllowlist]))
  : env.corsAllowlist;

const sanitizeHeaders = (headers: IncomingHttpHeaders | undefined) => {
  if (!headers) return headers;
  const sanitized: IncomingHttpHeaders = { ...headers };
  if (sanitized.authorization) {
    sanitized.authorization = 'Bearer <redacted>';
  }
  if (sanitized.cookie) {
    sanitized.cookie = '<redacted>';
  }
  return sanitized;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(helmet());
app.use(
  pinoHttp({
    logger,
    autoLogging: env.nodeEnv !== 'test',
    serializers: {
      req(request) {
        const serialized = pino.stdSerializers.req(request);
        if (serialized && serialized.headers) {
          serialized.headers = sanitizeHeaders(serialized.headers);
        }
        return serialized;
      },
      res(response) {
        const serialized = pino.stdSerializers.res(response);
        if (serialized && serialized.headers && serialized.headers['set-cookie']) {
          serialized.headers['set-cookie'] = Array.isArray(serialized.headers['set-cookie'])
            ? serialized.headers['set-cookie'].map(() => '<redacted>')
            : '<redacted>';
        }
        return serialized;
      },
    },
  }),
);
app.use(globalRateLimiter);
app.use(json());
app.use(urlencoded({ extended: true }));

app.get(['/health', '/api/health'], (_req, res) => res.json({ ok: true }));
app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

app.use('/api/risks', riskRouter);
app.use('/api/findings', findingRouter);
app.use('/api/forms', formsRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/export', reportRouter);
app.use('/api', appRouter);
app.use('/api/surveys', surveysRouter);
app.use((req, res) => {
  const problem = {
    type: 'https://httpstatuses.com/404',
    title: 'Not Found',
    status: 404,
    detail: `Resource ${req.originalUrl} was not found`,
    ...(req.id ? { instance: req.id } : {}),
  } as const;

  res.status(404).json(problem);
});
app.use(zodErrorHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  logger.info(`API running on port ${env.port}`);
});

initializeQueueWorkers().catch((error) => {
  logger.error({ err: error }, 'No se pudieron inicializar los workers de la cola');
});

export { app, server };
