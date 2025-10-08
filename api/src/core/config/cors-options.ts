import type { CorsOptions } from 'cors';

const defaultOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:8080';

export const corsOptions: CorsOptions = {
  origin: defaultOrigin,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['ETag']
};
