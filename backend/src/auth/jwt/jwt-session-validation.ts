import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type JwtSessionPayload = {
  sub?: number | string;
  email?: string;
  role?: string;
  cinemaId?: number | string | null;
  iat?: number;
  exp?: number;
};

export type ValidatedJwtSession = {
  sub: number;
  email: string;
  role: string;
  cinemaId: number | null;
  iat?: number;
  exp?: number;
};

function parsePositiveInteger(value: unknown) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

export async function validateJwtSession(
  prisma: PrismaService,
  payload: JwtSessionPayload,
): Promise<ValidatedJwtSession> {
  const userId = parsePositiveInteger(payload.sub);

  if (!userId) {
    throw new UnauthorizedException('Token mangler en gyldig bruger');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedException(
      'Brugeren er deaktiveret eller findes ikke',
    );
  }

  if (payload.role !== user.role) {
    throw new UnauthorizedException(
      'Din brugerrolle er ændret. Log ind igen',
    );
  }

  if (user.role === 'MASTER') {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      cinemaId: null,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  const cinemaId = parsePositiveInteger(payload.cinemaId);

  if (!cinemaId) {
    throw new UnauthorizedException(
      'Din session mangler en aktiv biograf. Log ind igen',
    );
  }

  const membership = await prisma.userCinemaMembership.findFirst({
    where: {
      userId: user.id,
      cinemaId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!membership) {
    throw new UnauthorizedException(
      'Din biograftilknytning er ikke længere aktiv. Log ind igen',
    );
  }

  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    cinemaId,
    iat: payload.iat,
    exp: payload.exp,
  };
}
