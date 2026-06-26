import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShiftTradeStatus, ShiftTradeType } from '@prisma/client';

import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { shiftTradeInclude } from './shift-trade-service-helpers';

type ShiftTradeAcceptFlowDeps = {
  prisma: PrismaService;
  realtime: RealtimeGateway;
  notifications: NotificationsService;
  push: PushService;
};

export async function acceptShiftTrade(
  deps: ShiftTradeAcceptFlowDeps,
  id: number,
  acceptedByUserId: number,
) {
  const { prisma, realtime, notifications, push } = deps;

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

  await prisma.shiftTrade.update({
    where: { id },
    data: {
      status: ShiftTradeStatus.ACCEPTED,
      acceptedByUserId,
    },
  });

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

  await prisma.shift.update({
    where: {
      id: trade.shiftId,
    },
    data: {
      userId: acceptedByUserId,
    },
  });

  const updatedTrade = await prisma.shiftTrade.findUnique({
    where: { id },
    include: shiftTradeInclude,
  });

  realtime.notifyAll('shiftTradesUpdated', updatedTrade);
  if (updatedTrade) {
    if (updatedTrade) {
      realtime.notifyCinema(
        updatedTrade.cinemaId,
        'shiftAccepted',
        updatedTrade,
      );
    }
  }

  await notifications.create({
    userId: trade.offeredByUserId,
    cinemaId: trade.cinemaId,
    title: 'Vagt accepteret',
    message: 'Din tilbudte vagt blev accepteret',
    type: 'SHIFT_ACCEPTED',
    linkUrl: '/my-shifts',
  });

  await push.sendToUser(trade.offeredByUserId, {
    title: 'Vagt accepteret',
    body: 'Din tilbudte vagt blev accepteret',
    url: '/my-shifts',
  });

  realtime.notifyCinema(trade.cinemaId, 'shiftsUpdated', {
    shiftId: trade.shiftId,
    acceptedByUserId,
  });

  return updatedTrade;
}
