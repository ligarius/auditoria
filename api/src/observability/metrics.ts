import type { Request, Response } from 'express';
import client from 'prom-client';

import { env } from '../config/env.js';

const register = new client.Registry();
register.setDefaultLabels({
  app: 'auditoria-api'
});
client.collectDefaultMetrics({ register, prefix: env.METRICS_PREFIX });

export const metricsHandler = async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
};

export { register as metricsRegister };
