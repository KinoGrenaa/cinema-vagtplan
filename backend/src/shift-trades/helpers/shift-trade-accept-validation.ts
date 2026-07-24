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

type ActionableShiftTrade = {
  status: ShiftTradeStatus;
  type: ShiftTradeType;
  offeredByUserId: number;
  targetUserId: number | null;
};

export function resolveShiftTradeActorUserId(
  actor: ShiftTradeActor,
) {
  const userId = Number(
    actor?.sub ?? actor?.id,
  );

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new ForbiddenException(
      'Brugeren kunne ikke identificeres',
    );
  }

  return userId;
}

export async function resolveShiftTradeActorContext(
  prisma: PrismaService,
  actor: ShiftTradeActor,
) {
  const userId =
    resolveShiftTradeActorUserId(actor);
  const cinemaId = Number(actor?.cinemaId);

  if (actor?.role === 'MASTER') {
    throw new ForbiddenException(
      'MASTER kan ikke håndtere personlige vagtbytter',
    );
  }

  if (
    !Number.isInteger(cinemaId) ||
    cinemaId <= 0
  ) {
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
      role: true,
      isActive: true,
      cinemaMemberships: {
        where: {
          cinemaId,
          isActive: true,
        },
        select: {
          role: true,
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
      'Brugerkontoen er spærret',
    );
  }

  if (user.role === 'MASTER') {
    throw new ForbiddenException(
      'MASTER kan ikke håndtere personlige vagtbytter',
    );
  }

  const membership =
    user.cinemaMemberships[0];

  if (!membership) {
    throw new ForbiddenException(
      'Brugeren er ikke aktivt tilknyttet denne biograf',
    );
  }

  if (
    actor.role &&
    actor.role !== membership.role
  ) {
    throw new ForbiddenException(
      'Din rolle i denne biograf er ændret. Log ind igen.',
    );
  }

  return {
    userId,
    cinemaId,
  };
}

export function ensureShiftTradeCanBeAccepted(
  trade: ActionableShiftTrade,
  actorUserId: number,
) {
  if (
    trade.status !== ShiftTradeStatus.OPEN
  ) {
    throw new ForbiddenException(
      'Vagtbyttet er ikke længere åbent',
    );
  }

  if (
    trade.offeredByUserId === actorUserId
  ) {
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
}

export function ensureShiftTradeCanBeRejected(
  trade: ActionableShiftTrade,
  actorUserId: number,
) {
  if (
    trade.status !== ShiftTradeStatus.OPEN
  ) {
    throw new ForbiddenException(
      'Vagtbyttet er ikke længere åbent',
    );
  }

  if (
    trade.type !== ShiftTradeType.DIRECT
  ) {
    throw new ForbiddenException(
      'Vagtpuljer kan ikke afvises',
    );
  }

  if (
    trade.targetUserId !== actorUserId
  ) {
    throw new ForbiddenException(
      'Denne vagt er ikke sendt til dig',
    );
  }
}
