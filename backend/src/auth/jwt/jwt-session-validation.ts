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
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
  canManageSchedule: boolean;
  canManageUsers: boolean;
  canManagePayroll: boolean;
  canManageLeaveRequests: boolean;
  canManageCinemaSettings: boolean;
  canSendBroadcastMessages: boolean;
  iat?: number;
  exp?: number;
};

const MASTER_PERMISSIONS = {
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
} as const;

function parsePositiveInteger(value: unknown) {
  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue <= 0
  ) {
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
    throw new UnauthorizedException(
      'Token mangler en gyldig bruger',
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
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

  if (user.role === 'MASTER') {
    if (payload.role !== 'MASTER') {
      throw new UnauthorizedException(
        'Din systemrolle er ændret.\nLog ind igen',
      );
    }

    return {
      sub: user.id,
      email: user.email,
      role: 'MASTER',
      cinemaId: null,
      ...MASTER_PERMISSIONS,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  const cinemaId = parsePositiveInteger(
    payload.cinemaId,
  );

  if (!cinemaId) {
    throw new UnauthorizedException(
      'Din session mangler en aktiv biograf.\nLog ind igen',
    );
  }

  const membership =
    await prisma.userCinemaMembership.findFirst({
      where: {
        userId: user.id,
        cinemaId,
        isActive: true,
      },
      select: {
        role: true,
        canManageSchedule: true,
        canManageUsers: true,
        canManagePayroll: true,
        canManageLeaveRequests: true,
        canManageCinemaSettings: true,
        canSendBroadcastMessages: true,
      },
    });

  if (!membership) {
    throw new UnauthorizedException(
      'Din biograftilknytning er ikke længere aktiv.\nLog ind igen',
    );
  }

  if (payload.role !== membership.role) {
    throw new UnauthorizedException(
      'Din rolle i den aktive biograf er ændret.\nLog ind igen',
    );
  }

  return {
    sub: user.id,
    email: user.email,
    role: membership.role,
    cinemaId,
    canManageSchedule:
      membership.canManageSchedule,
    canManageUsers: membership.canManageUsers,
    canManagePayroll:
      membership.canManagePayroll,
    canManageLeaveRequests:
      membership.canManageLeaveRequests,
    canManageCinemaSettings:
      membership.canManageCinemaSettings,
    canSendBroadcastMessages:
      membership.canSendBroadcastMessages,
    iat: payload.iat,
    exp: payload.exp,
  };
}
