import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShiftTradeStatus, ShiftTradeType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export async function findAcceptedByUserCinemaId(
  prisma: PrismaService,
  acceptedByUserId: number,
) {
  const acceptedByUser = await prisma.user.findUnique({
    where: {
      id: acceptedByUserId,
    },
  });

  if (!acceptedByUser) {
    throw new NotFoundException('Bruger blev ikke fundet');
  }

  const acceptedByUserCinemaId = acceptedByUser.cinemaId;

  if (acceptedByUserCinemaId === null) {
    throw new ForbiddenException(
      'Brugeren er ikke tilknyttet en biograf og kan ikke acceptere vagtbytter',
    );
  }

  return acceptedByUserCinemaId;
}

export async function findAcceptableShiftTrade(
  prisma: PrismaService,
  id: number,
  acceptedByUserCinemaId: number,
  acceptedByUserId: number,
) {
  const trade = await prisma.shiftTrade.findFirst({
    where: {
      id,
      cinemaId: acceptedByUserCinemaId,
    },
  });

  if (!trade) {
    throw new NotFoundException('Vagtbytte blev ikke fundet');
  }

  if (trade.status !== ShiftTradeStatus.OPEN) {
    throw new ForbiddenException('Vagtbyttet er ikke længere åbent');
  }

  if (trade.offeredByUserId === acceptedByUserId) {
    throw new ForbiddenException('Du kan ikke acceptere din egen vagt');
  }

  if (
    trade.type === ShiftTradeType.DIRECT &&
    trade.targetUserId !== acceptedByUserId
  ) {
    throw new ForbiddenException('Denne vagt er ikke sendt til dig');
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
    throw new NotFoundException('Vagten blev ikke fundet');
  }

  const conflictingShift = await prisma.shift.findFirst({
    where: {
      cinemaId: trade.cinemaId,
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
    throw new ForbiddenException('Du har allerede en vagt i dette tidsrum');
  }
}
