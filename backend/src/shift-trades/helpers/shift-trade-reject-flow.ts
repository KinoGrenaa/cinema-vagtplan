import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ShiftTradeStatus } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  getShiftTradeNotificationLink,
} from '../../notifications/helpers/notification-deep-links';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  ensureShiftTradeCanBeRejected,
  resolveShiftTradeActorContext,
  ShiftTradeActor,
} from './shift-trade-accept-validation';
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
  actor: ShiftTradeActor,
) {
  const {
    prisma,
    realtime,
    notifications,
    push,
  } = deps;
  const {
    userId,
    cinemaId,
  } = await resolveShiftTradeActorContext(
    prisma,
    actor,
  );

  const trade = await prisma.$transaction(
    async (tx) => {
      const existingTrade =
        await tx.shiftTrade.findFirst({
          where: {
            id,
            cinemaId,
          },
        });

      if (!existingTrade) {
        throw new NotFoundException(
          'Vagtbytte blev ikke fundet',
        );
      }

      ensureShiftTradeCanBeRejected(
        existingTrade,
        userId,
      );

      const rejected =
        await tx.shiftTrade.updateMany({
          where: {
            id,
            cinemaId,
            status: ShiftTradeStatus.OPEN,
          },
          data: {
            status:
              ShiftTradeStatus.REJECTED,
            rejectedByUserId: userId,
          },
        });

      if (rejected.count !== 1) {
        throw new ForbiddenException(
          'Vagtbyttet er ikke længere åbent',
        );
      }

      return tx.shiftTrade.findUnique({
        where: {
          id,
        },
        include: shiftTradeInclude,
      });
    },
  );

  if (!trade) {
    throw new NotFoundException(
      'Vagtbytte blev ikke fundet',
    );
  }

  realtime.notifyCinema(
    trade.cinemaId,
    'shiftTradesUpdated',
    trade,
  );
  realtime.notifyCinema(
    trade.cinemaId,
    'shiftRejected',
    trade,
  );

  if (trade.offeredByUserId !== userId) {
    await notifications.create({
      userId: trade.offeredByUserId,
      cinemaId: trade.cinemaId,
      title: 'Vagt afvist',
      message:
        'Din tilbudte vagt blev afvist',
      type: 'SHIFT_REJECTED',
      linkUrl:
        getShiftTradeNotificationLink(
          trade.id,
        ),
    });
    await push.sendToUserInCinema(
      trade.offeredByUserId,
      trade.cinemaId,
      {
        title: 'Vagt afvist',
        body:
          'Din tilbudte vagt blev afvist',
        url:
          getShiftTradeNotificationLink(
            trade.id,
          ),
      },
    );
  }

  return trade;
}
