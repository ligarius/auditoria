import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Desactiva CORS automático de Nest para manejar preflight primero
  const app = await NestFactory.create(AppModule, { cors: false });

  const ALLOWED_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:8080';

  // Manejo explícito de OPTIONS antes de guards/filters
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cache-Control, Pragma');
      res.setHeader('Access-Control-Max-Age', '86400');
      // Si se usan cookies/sesión, descomentar:
      // res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.status(204).end();
      return;
    }
    next();
  });

  // CORS para requests reales
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
      return cb(new Error('CORS origin not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['ETag'],
    // credentials: true, // habilitar si usas cookies de sesión
    maxAge: 86400,
  });

  await app.listen(4000);
}
bootstrap();
