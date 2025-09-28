import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import morgan from 'morgan';
import 'express-async-errors';

import { env } from './config/env.js';
import { errorHandler } from './core/errors/error-handler.js';
import { prisma } from './core/config/db.js';
import { logger } from './observability/logger.js';
import { metricsHandler } from './observability/metrics.js';
import { helmetMiddleware } from './middleware/helmet.js';
import { corsMiddleware } from './middleware/cors.js';
import { apiRateLimiter } from './middleware/ratelimit.js';
import { appRouter } from './app.js';
import { riskRouter } from './modules/risks/risk.router.js';
import { findingRouter } from './modules/findings/finding.router.js';

const app = express();

app.disable('x-powered-by');
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(json({ limit: '1mb' }));
app.use(urlencoded({ extended: true }));

app.get('/metrics', metricsHandler);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/ready', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use('/api', apiRateLimiter);
app.use('/api/risks', riskRouter);
app.use('/api/findings', findingRouter);
app.use('/api', appRouter);
app.use(errorHandler);

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`API running on port ${PORT}`);
});

export { app };
