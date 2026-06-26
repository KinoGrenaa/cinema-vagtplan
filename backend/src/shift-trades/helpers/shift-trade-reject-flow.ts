import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShiftTradeStatus, ShiftTradeType } from '@prisma/client';

import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { shiftTradeInclude } from './shift-trade-service-helpers';

type ShiftTradeRejectFlowDeps = {
  prisma: PrismaService;
  realtime: RealtimeGateway;
  notifications: NotificationsService;
  push: PushService;
};

export async function rejectShiftTrade(
  deps: ShiftTradeRejectFlowDeps,
  id: number,
  rejectedByUserId: number,
) {
  const { prisma, realtime, notifications, push } = deps;

  const rejectedByUser = await prisma.user.findUnique({
    where: {
      id: rejectedByUserId,
    },
  });

  if (!rejectedByUser) {
    throw new NotFoundException('Bruger blev ikke fundet');
  }

  const rejectedByUserCinemaId = rejectedByUser.cinemaId;

  if (rejectedByUserCinemaId === null) {
    throw new ForbiddenException(
      'Brugeren er ikke tilknyttet en biograf og kan ikke afvise vagtbytter',
    );
  }

  const existingTrade = await prisma.shiftTrade.findFirst({
    where: {
      id,
      cinemaId: rejectedByUserCinemaId,
    },
  });

  if (!existingTrade) {
    throw new NotFoundException('Vagtbytte blev ikke fundet');
  }

  if (existingTrade.status !== ShiftTradeStatus.OPEN) {
    throw new ForbiddenException('Vagtbyttet er ikke længere åbent');
  }

  if (
    existingTrade.type === ShiftTradeType.DIRECT &&
    existingTrade.targetUserId !== rejectedByUserId
  ) {
    throw new ForbiddenException('Denne vagt er ikke sendt til dig');
  }

  await prisma.shiftTrade.update({
    where: { id },
    data: {
      status: ShiftTradeStatus.REJECTED,
      rejectedByUserId,
    },
  });

  const trade = await prisma.shiftTrade.findUnique({
    where: { id },
    include: shiftTradeInclude,
  });

  if (!trade) {
    throw new NotFoundException('Vagtbytte blev ikke fundet');
  }

  realtime.notifyCinema(trade.cinemaId, 'shiftTradesUpdated', trade);
  realtime.notifyCinema(trade.cinemaId, 'shiftRejected', trade);

  if (trade.offeredByUserId !== rejectedByUserId) {
    await notifications.create({
      userId: trade.offeredByUserId,
      cinemaId: trade.cinemaId,
      title: 'Vagt afvist',
      message: 'Din tilbudte vagt blev afvist',
      type: 'SHIFT_REJECTED',
      linkUrl: '/my-shifts',
    });

    await push.sendToUser(trade.offeredByUserId, {
      title: 'Vagt afvist',
      body: 'Din tilbudte vagt blev afvist',
      url: '/my-shifts',
    });
  }

  return trade;
}
