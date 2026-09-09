import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  getShiftTradeNotificationLink,
} from '../../notifications/helpers/notification-deep-links';
import { PushService } from '../../push/push.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  resolveShiftTradeActorContext,
  ShiftTradeActor,
} from './shift-trade-accept-validation';
import {
  resolveShiftTradeOfferNotifications,
} from './shift-trade-notification-resolution';
import {
  formatShiftTradePeriod,
} from './shift-trade-period';
import {
  getShiftTradeDisplayData,
  shiftTradeInclude,
} from './shift-trade-service-helpers';
type ShiftTradeCancelFlowDeps = {
  prisma: PrismaService;
  realtime: RealtimeGateway;
  notifications: NotificationsService;
  push: PushService;
};

export async function cancelShiftTrade(
  deps: ShiftTradeCancelFlowDeps,
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

  const result =
    await prisma.$transaction(
      async (tx) => {
        const existingTrade =
          await tx.shiftTrade.findFirst({
            where: {
              id,
              cinemaId,
            },
            include: {
              shift: {
                select: {
                  startTime: true,
                  endTime: true,
                },
              },
            },
          });

        if (!existingTrade) {
          throw new NotFoundException(
            'Vagtbytte blev ikke fundet',
          );
        }

        if (
          existingTrade.offeredByUserId !==
          userId
        ) {
          throw new ForbiddenException(
            'Du kan kun annullere dine egne vagtbytter',
          );
        }

        if (
          existingTrade.status !==
          ShiftTradeStatus.OPEN
        ) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere åbent',
          );
        }

        const cancelled =
          await tx.shiftTrade.updateMany({
            where: {
              id,
              cinemaId,
              offeredByUserId:
                userId,
              status:
                ShiftTradeStatus.OPEN,
            },
            data: {
              status:
                ShiftTradeStatus.CANCELLED,
              resolvedAt: new Date(),
              resolvedByUserId:
                userId,
              resolutionReason:
                'WITHDRAWN_BY_OFFERER',
              ...(existingTrade.shift
                ? {
                    shiftStartTimeSnapshot:
                      existingTrade.shift.startTime,
                    shiftEndTimeSnapshot:
                      existingTrade.shift.endTime,
                  }
                : {}),
            },
          });

        if (
          cancelled.count !== 1
        ) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere åbent',
          );
        }

        const notificationUserIds =
          await resolveShiftTradeOfferNotifications(
            tx,
            cinemaId,
            [id],
          );

        const trade =
          await tx.shiftTrade.findUnique({
            where: {
              id,
            },
            include:
              shiftTradeInclude,
          });

        if (!trade) {
          throw new NotFoundException(
            'Vagtbytte blev ikke fundet',
          );
        }

        return {
          trade,
          notificationUserIds,
        };
      },
    );

  for (
    const notificationUserId of
    result.notificationUserIds
  ) {
    realtime.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId:
          result.trade.cinemaId,
        shiftTradeId:
          result.trade.id,
        resolved: true,
      },
    );
  }

  realtime.notifyCinema(
    result.trade.cinemaId,
    'shiftTradesUpdated',
    result.trade,
  );

  if (
    result.trade.type === ShiftTradeType.DIRECT &&
    result.trade.targetUserId
  ) {
    const display = getShiftTradeDisplayData(result.trade);
    const message =
      `Vagttilbuddet på ${display.jobFunctionName} ${formatShiftTradePeriod(display.startTime, display.endTime)} er blevet trukket tilbage af afsenderen.`;
    const linkUrl = getShiftTradeNotificationLink(result.trade.id);
    await notifications.create({
      userId: result.trade.targetUserId,
      cinemaId: result.trade.cinemaId,
      title: 'Direkte vagttilbud trukket tilbage',
      message,
      type: 'SHIFT_TRADE_CANCELLED',
      linkUrl,
    });
    await push.sendToUserInCinema(
      result.trade.targetUserId,
      result.trade.cinemaId,
      {
        title: 'Direkte vagttilbud trukket tilbage',
        body: message,
        url: linkUrl,
      },
    );
  }

  return result.trade;
}
