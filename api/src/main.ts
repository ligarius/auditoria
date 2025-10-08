import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { corsOptions as configuredCorsOptions } from './core/config/cors-options';
import { configureApp, startBackgroundProcesses } from './server';

async function bootstrap() {
  const expressServer = express();
  configureApp(expressServer);

  const corsOptions: CorsOptions = {
    ...configuredCorsOptions,
    origin: configuredCorsOptions.origin,
    methods: configuredCorsOptions.methods,
    allowedHeaders: configuredCorsOptions.allowedHeaders,
    exposedHeaders: configuredCorsOptions.exposedHeaders
  };

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer),
    { bufferLogs: true }
  );

  app.enableCors(corsOptions);

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
  console.log(`API running on port ${port}`);
}
bootstrap();
