import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { json, urlencoded } from 'express';
import 'express-async-errors';

import { errorHandler } from './core/errors/error-handler.js';
import { logger } from './core/config/logger.js';
import { appRouter } from './app.js';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ?? '*' }));
app.use(morgan('dev'));
app.use(json());
app.use(urlencoded({ extended: true }));
app.use('/api', appRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API running on port ${PORT}`);
});

export { app };
