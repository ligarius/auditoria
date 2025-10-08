import 'dotenv/config';
import 'express-async-errors';

import type { Server } from 'http';
import type { Express, RequestHandler } from 'express';

import cookieParser from 'cookie-parser';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { pino } from 'pino';

import { appRouter } from './app';
import { env } from './core/config/env';
import { metricsRegistry } from './core/metrics/registry';
import { globalRateLimiter } from './core/middleware/rate-limit';
import { noCacheDevMiddleware } from './core/middleware/no-cache-dev';
import { errorHandler } from './core/errors/error-handler';
import { logger } from './core/config/logger';
import workflowRouter from './modules/workflow/workflow.router';
import reportRouter from './modules/export/report.router';
import { initializeQueueWorkers } from './services/queue';
import { startApprovalSlaMonitor } from './services/approval-sla';
import surveysRouter from './routes/surveys';
import { zodErrorHandler } from './common/validation/zod-error.middleware';
import { startKpiSnapshotCron } from './modules/kpis/kpi-snapshot.job';
import { pdfCheck } from './routes/debug/pdf-check';

type AppLocals = {
  nestBootstrapped?: boolean;
  helmetConfigured?: boolean;
};

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

const configureApp = (app: Express): Express => {
  app.set('etag', false);

  const resolvedAppEnv =
    process.env.APP_ENV ?? process.env.NODE_ENV ?? env.nodeEnv ?? 'development';
  const isDev = resolvedAppEnv !== 'production';

  if (isDev) {
    app.use(noCacheDevMiddleware);
  }

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
  app.use(globalRateLimiter);

  app.use((_, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  const respondHealth: RequestHandler = (_req, res) => {
    res.json({ ok: true });
  };

  app.get('/api/health', respondHealth);
  app.get('/health', (req, res, next) => {
    const locals = app.locals as AppLocals;
    if (locals?.nestBootstrapped) {
      return next();
    }
    return respondHealth(req, res, next);
  });

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  });

  app.use('/api', appRouter);
  app.use('/api/workflow', workflowRouter);
  app.use('/api/export', reportRouter);
  app.use('/api/surveys', surveysRouter);
  app.get('/api/debug/pdf-check', pdfCheck);
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

  return app;
};

const app = configureApp(express());

let serverInstance: Server | null = null;
let backgroundProcessesStarted = false;

const ensureHelmet = (instance: Express): void => {
  const locals = instance.locals as AppLocals;
  if (!locals.helmetConfigured) {
    instance.use(helmet({ crossOriginResourcePolicy: false }));
    locals.helmetConfigured = true;
  }
};

const startBackgroundProcesses = (): void => {
  if (backgroundProcessesStarted) {
    return;
  }

  backgroundProcessesStarted = true;

  const shouldInitQueues = process.env.DISABLE_QUEUES !== 'true';

  if (shouldInitQueues) {
    initializeQueueWorkers().catch((error) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : '';

      if (
        typeof message === 'string' &&
        (message.includes('Redis is already connecting') ||
          message.includes('Redis is already connected'))
      ) {
        logger.warn({ err: error }, 'BullMQ deshabilitado: Redis ya estaba conectado');
        return;
      }

      logger.error({ err: error }, 'No se pudieron inicializar los workers de la cola');
    });
  } else {
    logger.warn('BullMQ deshabilitado por DISABLE_QUEUES=true');
  }

  if (env.nodeEnv !== 'test') {
    startApprovalSlaMonitor();
    startKpiSnapshotCron();
  }
};

const startServer = (): Server => {
  if (serverInstance) {
    return serverInstance;
  }

  ensureHelmet(app);

  serverInstance = app.listen(env.port, () => {
    logger.info(`API running on port ${env.port}`);
    startBackgroundProcesses();
  });

  return serverInstance;
};

export { app, configureApp, ensureHelmet, startBackgroundProcesses, startServer };
