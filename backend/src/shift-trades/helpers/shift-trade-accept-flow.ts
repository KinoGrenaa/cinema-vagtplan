import { ShiftTradeStatus } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  ensureAcceptedShiftHasNoConflicts,
  findAcceptableShiftTrade,
  findAcceptedByUserCinemaId,
} from './shift-trade-accept-validation';
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

  const acceptedByUserCinemaId =
    await findAcceptedByUserCinemaId(
      prisma,
      acceptedByUserId,
    );
  const trade = await findAcceptableShiftTrade(
    prisma,
    id,
    acceptedByUserCinemaId,
    acceptedByUserId,
  );

  await ensureAcceptedShiftHasNoConflicts(
    prisma,
    trade,
    acceptedByUserId,
  );

  await prisma.$transaction([
    prisma.shiftTrade.update({
      where: { id },
      data: {
        status: ShiftTradeStatus.ACCEPTED,
        acceptedByUserId,
      },
    }),
    prisma.shift.update({
      where: {
        id: trade.shiftId,
      },
      data: {
        userId: acceptedByUserId,
      },
    }),
  ]);

  const updatedTrade = await prisma.shiftTrade.findUnique({
    where: { id },
    include: shiftTradeInclude,
  });

  if (updatedTrade) {
    realtime.notifyCinema(
      updatedTrade.cinemaId,
      'shiftTradesUpdated',
      updatedTrade,
    );
    realtime.notifyCinema(
      updatedTrade.cinemaId,
      'shiftAccepted',
      updatedTrade,
    );
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
