import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { json, urlencoded } from 'express';
import 'express-async-errors';

import { errorHandler } from './core/errors/error-handler.js';
import { logger } from './core/config/logger.js';
import { appRouter } from './app.js';
import { riskRouter } from './modules/risks/risk.router.js';
import { findingRouter } from './modules/findings/finding.router.js';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ?? '*' }));
app.use(morgan('dev'));
app.use(json());
app.use(urlencoded({ extended: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/risks', riskRouter);
app.use('/api/findings', findingRouter);
app.use('/api', appRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API running on port ${PORT}`);
});

export { app };
