import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  JwtService,
} from '@nestjs/jwt';
import type {
  Request,
} from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type JwtSessionPayload,
  type ValidatedJwtSession,
  validateJwtSession,
} from './jwt-session-validation';

type AuthenticatedRequest =
  Request & {
    user?: ValidatedJwtSession;
  };

@Injectable()
export class JwtGuard
  implements CanActivate
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ) {
    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    if (request.user) {
      return true;
    }

    const authHeader =
      request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        'Du er ikke logget ind',
      );
    }

    const [type, token] =
      authHeader.split(' ');

    if (
      type !== 'Bearer' ||
      !token
    ) {
      throw new UnauthorizedException(
        'Ugyldig token',
      );
    }

    let payload: JwtSessionPayload;

    try {
      payload =
        await this.jwtService.verifyAsync(
          token,
          {
            secret:
              process.env.JWT_SECRET,
          },
        );
    } catch {
      throw new UnauthorizedException(
        'Token er ugyldig eller udløbet',
      );
    }

    request.user =
      await validateJwtSession(
        this.prisma,
        payload,
      );

    return true;
  }
}
