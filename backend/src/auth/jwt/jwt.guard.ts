import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  JwtSessionPayload,
  validateJwtSession,
  ValidatedJwtSession,
} from './jwt-session-validation';

type AuthenticatedRequest = Request & {
  user?: ValidatedJwtSession;
};

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Du er ikke logget ind');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Ugyldig token');
    }

    let payload: JwtSessionPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtSessionPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token er ugyldig eller udløbet');
    }

    request.user = await validateJwtSession(this.prisma, payload);
    return true;
  }
}
