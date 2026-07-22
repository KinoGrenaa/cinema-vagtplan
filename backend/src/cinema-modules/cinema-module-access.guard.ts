import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  Request,
} from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  type JwtSessionPayload,
  type ValidatedJwtSession,
  validateJwtSession,
} from '../auth/jwt/jwt-session-validation';
import {
  CINEMA_MODULE_CATALOG,
  type CinemaModuleKey,
} from './cinema-module-catalog';
import { CinemaModulesService } from './cinema-modules.service';
import {
  getCinemaModuleForRequestPath,
} from './cinema-module-route-access';

type ModuleAccessRequest = Request & {
  user?: ValidatedJwtSession;
};

function parsePositiveInteger(
  value: unknown,
) {
  if (
    Array.isArray(value) ||
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const normalized =
    typeof value === 'string'
      ? value.trim()
      : value;
  const numericValue =
    Number(normalized);

  if (
    !Number.isInteger(
      numericValue,
    ) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

function readHeaderCinemaId(
  request: ModuleAccessRequest,
) {
  const headerValue =
    request.headers[
      'x-cinema-id'
    ];

  if (Array.isArray(headerValue)) {
    return parsePositiveInteger(
      headerValue[0],
    );
  }

  return parsePositiveInteger(
    headerValue,
  );
}

function readRequestCinemaId(
  request: ModuleAccessRequest,
) {
  return (
    readHeaderCinemaId(request) ??
    parsePositiveInteger(
      request.query?.cinemaId,
    ) ??
    parsePositiveInteger(
      (
        request.body as
          | Record<
              string,
              unknown
            >
          | undefined
      )?.cinemaId,
    )
  );
}

function getModuleName(
  moduleKey: CinemaModuleKey,
) {
  return (
    CINEMA_MODULE_CATALOG.find(
      (module) =>
        module.key === moduleKey,
    )?.name ?? moduleKey
  );
}

@Injectable()
export class CinemaModuleAccessGuard
  implements CanActivate
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly cinemaModulesService: CinemaModulesService,
  ) {}

  private async authenticate(
    request: ModuleAccessRequest,
  ) {
    if (request.user) {
      return request.user;
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

    const user =
      await validateJwtSession(
        this.prisma,
        payload,
      );

    request.user = user;

    return user;
  }

  private resolveCinemaId(
    request: ModuleAccessRequest,
    user: ValidatedJwtSession,
  ) {
    if (user.role !== 'MASTER') {
      if (!user.cinemaId) {
        throw new UnauthorizedException(
          'Din session mangler en aktiv biograf. Log ind igen',
        );
      }

      return user.cinemaId;
    }

    const selectedCinemaId =
      readRequestCinemaId(request);

    if (!selectedCinemaId) {
      throw new BadRequestException(
        'Vælg en aktiv biograf i MASTER-panelet, før modulet bruges',
      );
    }

    return selectedCinemaId;
  }

  async canActivate(
    context: ExecutionContext,
  ) {
    const request =
      context
        .switchToHttp()
        .getRequest<ModuleAccessRequest>();
    const requestPath =
      request.originalUrl ||
      request.url ||
      `${request.baseUrl ?? ''}${request.path ?? ''}`;
    const moduleKey =
      getCinemaModuleForRequestPath(
        requestPath,
      );

    if (!moduleKey) {
      return true;
    }

    const user =
      await this.authenticate(
        request,
      );
    const cinemaId =
      this.resolveCinemaId(
        request,
        user,
      );
    const enabled =
      await this.cinemaModulesService.isEnabled(
        cinemaId,
        moduleKey,
      );

    if (!enabled) {
      throw new ForbiddenException({
        code:
          'CINEMA_MODULE_DISABLED',
        moduleKey,
        cinemaId,
        message:
          `${getModuleName(
            moduleKey,
          )} er ikke aktiveret for den valgte biograf`,
      });
    }

    return true;
  }
}
