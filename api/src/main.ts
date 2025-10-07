import cors from 'cors';

import { app, startServer } from './server';

app.use(
  cors({
    origin: ['http://localhost:8080'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'X-Requested-With'
    ],
    exposedHeaders: ['Content-Length', 'ETag'],
    credentials: true,
    maxAge: 86400
  })
);

startServer();
