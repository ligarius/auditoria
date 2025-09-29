import 'dotenv/config';
import cors from 'cors';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import 'express-async-errors';

import { appRouter } from './app.js';
import { env } from './core/config/env.js';
import { metricsRegistry } from './core/metrics/registry.js';
import { globalRateLimiter } from './core/middleware/rate-limit.js';
import { errorHandler } from './core/errors/error-handler.js';
import { logger } from './core/config/logger.js';
import { findingRouter } from './modules/findings/finding.router.js';
import { riskRouter } from './modules/risks/risk.router.js';
import { initializeQueueWorkers } from './services/queue.js';

const app = express();

const allowedOrigins = env.corsAllowlist;
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
  }),
);

app.use(helmet());
app.use(
  pinoHttp({
    logger,
    autoLogging: env.nodeEnv !== 'test',
  }),
);
app.use(globalRateLimiter);
app.use(json());
app.use(urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

app.use('/api/risks', riskRouter);
app.use('/api/findings', findingRouter);
app.use('/api', appRouter);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  logger.info(`API running on port ${env.port}`);
});

initializeQueueWorkers().catch((error) => {
  logger.error({ err: error }, 'No se pudieron inicializar los workers de la cola');
});

export { app, server };
