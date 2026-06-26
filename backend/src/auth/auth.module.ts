import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

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
    UsersModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}