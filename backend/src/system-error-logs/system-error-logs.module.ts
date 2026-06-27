import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { SystemErrorLogsController } from './system-error-logs.controller';
import { SystemErrorLoggingInterceptor } from './system-error-logging.interceptor';
import { SystemErrorLogsService } from './system-error-logs.service';

const INSECURE_PRODUCTION_JWT_SECRETS = new Set([
  'secret',
  'jwt-secret',
  'jwt_secret',
  'dev-secret',
  'test-secret',
  'changeme',
  'change-me',
  'change-me-in-production',
]);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET skal være sat.');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isKnownInsecureSecret = INSECURE_PRODUCTION_JWT_SECRETS.has(
    secret.toLowerCase(),
  );

  if (isProduction && (secret.length < 32 || isKnownInsecureSecret)) {
    throw new Error(
      'JWT_SECRET skal være en stærk production-secret på mindst 32 tegn.',
    );
  }

  return secret;
}

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SystemErrorLogsController],
  providers: [
    SystemErrorLogsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: SystemErrorLoggingInterceptor,
    },
  ],
  exports: [SystemErrorLogsService],
})
export class SystemErrorLogsModule {}
