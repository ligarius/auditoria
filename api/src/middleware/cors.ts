import cors from 'cors';

import { env } from '../config/env.js';

const allowedOrigins = new Set(
  env.corsOrigins.length > 0 ? env.corsOrigins : [env.CLIENT_URL]
);

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true
});
