import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

function getAllowedCorsOrigins(): string[] {
  const configuredOrigins =
    process.env.BACKEND_CORS_ORIGIN ??
    process.env.CORS_ORIGIN ??
    process.env.FRONTEND_ORIGIN ??
    'http://localhost:3000';

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: getAllowedCorsOrigins(),
    credentials: true,
  });

  app.use(
    '/uploads/cinema-logos',
    express.static(join(process.cwd(), 'uploads', 'cinema-logos')),
  );

  await app.listen(3001);
}

bootstrap();
