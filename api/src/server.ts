import 'dotenv/config';
import 'express-async-errors';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { pino } from 'pino';

import { appRouter } from './app.js';
import { env } from './core/config/env.js';
import { metricsRegistry } from './core/metrics/registry.js';
import { globalRateLimiter } from './core/middleware/rate-limit.js';
import { errorHandler } from './core/errors/error-handler.js';
import { logger } from './core/config/logger.js';
import workflowRouter from './modules/workflow/workflow.router.js';
import reportRouter from './modules/export/report.router.js';
import { initializeQueueWorkers } from './services/queue.js';
import { startApprovalSlaMonitor } from './services/approval-sla.js';
import surveysRouter from './routes/surveys.js';
import { zodErrorHandler } from './common/validation/zod-error.middleware.js';
import { startKpiSnapshotCron } from './modules/kpis/kpi-snapshot.job.js';

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
  headers: Record<string, string | string[] | undefined>
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
      acc[key] = Array.isArray(value) ? value.join(', ') : (value ?? '');
      return acc;
    },
    {}
  );
};

app.use(helmet());
app.use(
  pinoHttp({
    logger,
    autoLogging: env.nodeEnv !== 'test',
    serializers: {
      req(request: Parameters<typeof pino.stdSerializers.req>[0]) {
        const serialized = pino.stdSerializers.req(request);
        if (serialized && serialized.headers) {
          const headers = serialized.headers as Record<
            string,
            string | string[] | undefined
          >;
          const cleaned = sanitizeHeaders(headers);
          const setCookie = headers['set-cookie'];
          cleaned['set-cookie'] = Array.isArray(setCookie)
            ? setCookie.join(', ')
            : (setCookie ?? '');
          serialized.headers = cleaned;
        }
        return serialized;
      },
      res(response: Parameters<typeof pino.stdSerializers.res>[0]) {
        const serialized = pino.stdSerializers.res(response);
        if (serialized && serialized.headers) {
          const headers = serialized.headers as Record<
            string,
            string | string[] | undefined
          >;
          const cleaned = sanitizeHeaders(headers);
          const setCookie = headers['set-cookie'];
          cleaned['set-cookie'] = Array.isArray(setCookie)
            ? setCookie.map(() => '<redacted>').join(', ')
            : setCookie
              ? '<redacted>'
              : '';
          serialized.headers = cleaned;
        }
        return serialized;
      }
    }
  })
);
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
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
app.use(globalRateLimiter);

app.get(['/health', '/api/health'], (_req, res) => res.json({ ok: true }));
app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

app.use('/api', appRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/export', reportRouter);
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
