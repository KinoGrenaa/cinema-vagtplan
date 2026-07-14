import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type ShiftTradeActor = {
  sub?: number;
  id?: number;
  role?: string;
  cinemaId?: number | null;
};

export async function resolveShiftTradeActorContext(
  prisma: PrismaService,
  actor: ShiftTradeActor,
) {
  const userId = Number(actor?.sub ?? actor?.id);
  const cinemaId = Number(actor?.cinemaId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ForbiddenException(
      'Brugeren kunne ikke identificeres',
    );
  }

  if (actor?.role === 'MASTER') {
    throw new ForbiddenException(
      'MASTER kan ikke acceptere eller afvise personlige vagtbytter',
    );
  }

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    throw new ForbiddenException(
      'Vælg en aktiv biograf før du håndterer vagtbytter',
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      isActive: true,
      cinemaId: true,
      cinemaMemberships: {
        where: {
          cinemaId,
          isActive: true,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new NotFoundException(
      'Bruger blev ikke fundet',
    );
  }

  if (!user.isActive) {
    throw new ForbiddenException(
      'Brugeren er deaktiveret',
    );
  }

  const hasCinemaAccess =
    user.cinemaId === cinemaId ||
    user.cinemaMemberships.length > 0;

  if (!hasCinemaAccess) {
    throw new ForbiddenException(
      'Brugeren er ikke aktivt tilknyttet denne biograf',
    );
  }

  return {
    userId,
    cinemaId,
  };
}

export async function findAcceptableShiftTrade(
  prisma: PrismaService,
  id: number,
  actorCinemaId: number,
  actorUserId: number,
) {
  const trade = await prisma.shiftTrade.findFirst({
    where: {
      id,
      cinemaId: actorCinemaId,
    },
  });

  if (!trade) {
    throw new NotFoundException(
      'Vagtbytte blev ikke fundet',
    );
  }

  if (trade.status !== ShiftTradeStatus.OPEN) {
    throw new ForbiddenException(
      'Vagtbyttet er ikke længere åbent',
    );
  }

  if (trade.offeredByUserId === actorUserId) {
    throw new ForbiddenException(
      'Du kan ikke acceptere din egen vagt',
    );
  }

  if (
    trade.type === ShiftTradeType.DIRECT &&
    trade.targetUserId !== actorUserId
  ) {
    throw new ForbiddenException(
      'Denne vagt er ikke sendt til dig',
    );
  }

  return trade;
}

type AcceptableShiftTrade = Awaited<
  ReturnType<typeof findAcceptableShiftTrade>
>;

export async function ensureAcceptedShiftHasNoConflicts(
  prisma: PrismaService,
  trade: AcceptableShiftTrade,
  acceptedByUserId: number,
) {
  const shift = await prisma.shift.findUnique({
    where: {
      id: trade.shiftId,
    },
  });

  if (!shift) {
    throw new NotFoundException(
      'Vagten blev ikke fundet',
    );
  }

  const conflictingShift = await prisma.shift.findFirst({
    where: {
      userId: acceptedByUserId,
      id: {
        not: trade.shiftId,
      },
      startTime: {
        lt: shift.endTime,
      },
      endTime: {
        gt: shift.startTime,
      },
    },
  });

  if (conflictingShift) {
    throw new ForbiddenException(
      'Du har allerede en vagt i dette tidsrum',
    );
  }
}
