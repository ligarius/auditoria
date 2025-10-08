import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { configureApp, startBackgroundProcesses } from './server';

async function bootstrap() {
  const expressServer = express();
  configureApp(expressServer);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer),
    { bufferLogs: true }
  );

  const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:8080';
  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['ETag'],
  });

  const expressInstance = app.getHttpAdapter().getInstance();
  const locals = expressInstance.locals as {
    helmetConfigured?: boolean;
    nestBootstrapped?: boolean;
  };
  if (!locals.helmetConfigured) {
    app.use(helmet({ crossOriginResourcePolicy: false }));
    locals.helmetConfigured = true;
  }

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  locals.nestBootstrapped = true;
  startBackgroundProcesses();
  // eslint-disable-next-line no-console
  console.log(`API running on port ${port}`);
}
bootstrap();
