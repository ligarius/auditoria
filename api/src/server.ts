import 'dotenv/config';
import 'express-async-errors';

import cors from 'cors';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import pino from 'pino';

import { appRouter } from './app';
import { env } from './core/config/env';
import { metricsRegistry } from './core/metrics/registry';
import { globalRateLimiter } from './core/middleware/rate-limit';
import { errorHandler } from './core/errors/error-handler';
import { logger } from './core/config/logger';
import { findingRouter } from './modules/findings/finding.router';
import { riskRouter } from './modules/risks/risk.router';
import { formsRouter } from './modules/forms/forms.router';
import workflowRouter from './modules/workflow/workflow.router';
import reportRouter from './modules/export/report.router';
import { initializeQueueWorkers } from './services/queue';
import { startApprovalSlaMonitor } from './services/approval-sla';
import surveysRouter from './routes/surveys';
import { zodErrorHandler } from './common/validation/zod-error.middleware';
import { startKpiSnapshotCron } from './modules/kpis/kpi-snapshot.job';

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

const sanitizeHeaders = (
  headers: Record<string, string | string[]>
): Record<string, string> => {
  return Object.entries(headers).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'authorization') {
        acc[key] = 'Bearer <redacted>';
        return acc;
      }
      if (lowerKey === 'cookie') {
        acc[key] = '<redacted>';
        return acc;
      }
      acc[key] = Array.isArray(value) ? value.join(', ') : value;
      return acc;
    },
    {}
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
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
          const headers = (serialized.headers ?? {}) as Record<
            string,
            string | string[]
          >;
          const cleaned = sanitizeHeaders(headers);
          serialized.headers = cleaned;
          if (Array.isArray(headers['set-cookie'])) {
            serialized.headers['set-cookie'] = headers['set-cookie'].join(', ');
          }
        }
        return serialized;
      },
      res(response) {
        const serialized = pino.stdSerializers.res(response);
        if (serialized && serialized.headers) {
          const headers = serialized.headers as Record<
            string,
            string | string[]
          >;
          const cleaned = sanitizeHeaders(headers);
          serialized.headers = cleaned;
          const setCookie = headers['set-cookie'];
          if (Array.isArray(setCookie)) {
            serialized.headers['set-cookie'] = setCookie
              .map(() => '<redacted>')
              .join(', ');
          } else if (typeof setCookie === 'string') {
            serialized.headers['set-cookie'] = '<redacted>';
          }
        }
        return serialized;
      }
    }
  })
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
    ...(req.id ? { instance: req.id } : {})
  } as const;

  res.status(404).json(problem);
});
app.use(zodErrorHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  logger.info(`API running on port ${env.port}`);
});

initializeQueueWorkers().catch((error) => {
  logger.error(
    { err: error },
    'No se pudieron inicializar los workers de la cola'
  );
});

if (env.nodeEnv !== 'test') {
  startApprovalSlaMonitor();
  startKpiSnapshotCron();
}

export { app, server };
