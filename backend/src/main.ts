import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { getAllowedCorsOrigins } from './common/cors-origins';
import {
  elapsedMilliseconds,
  formatStartupDuration,
  processUptimeMilliseconds,
} from './common/startup-timing';

async function bootstrap() {
  const nestFactoryStartedAt = performance.now();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  Logger.log(
    `Nest-applikationen blev oprettet på ${formatStartupDuration(
      elapsedMilliseconds(nestFactoryStartedAt),
    )}.`,
    'Startup',
  );

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
    express.static(join(process.cwd(), 'uploads', 'cinema-logos'), {
      dotfiles: 'deny',
      index: false,
      fallthrough: false,
    }),
  );

  app.use(
    '/uploads/profile-images',
    express.static(join(process.cwd(), 'uploads', 'profile-images'), {
      dotfiles: 'deny',
      index: false,
      fallthrough: false,
    }),
  );

  await app.listen(3001);
  Logger.log(
    `Backend klar på port 3001 efter ${formatStartupDuration(
      processUptimeMilliseconds(),
    )}.`,
    'Startup',
  );
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
    undefined,
    'Startup',
  );
  process.exitCode = 1;
});
