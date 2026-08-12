import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ShiftTradeStatus,
} from '@prisma/client';
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
import {
  resolveShiftTradeOfferNotifications,
} from './shift-trade-notification-resolution';
import {
  getShiftTradeDisplayData,
  shiftTradeInclude,
} from './shift-trade-service-helpers';

type ShiftTradeRejectFlowDeps = {
  prisma: PrismaService;
  realtime: RealtimeGateway;
  notifications: NotificationsService;
  push: PushService;
};

function getParticipantName(
  user:
    | {
        firstName?: string | null;
        lastName?: string | null;
      }
    | null
    | undefined,
  fallback: string,
) {
  const name =
    `${user?.firstName ?? ''} ${
      user?.lastName ?? ''
    }`.trim();

  return name || fallback;
}

function formatTradeDateTime(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    'da-DK',
    {
      timeZone:
        'Europe/Copenhagen',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(value);
}

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

  const result =
    await prisma.$transaction(
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
              status:
                ShiftTradeStatus.OPEN,
            },
            data: {
              status:
                ShiftTradeStatus.REJECTED,
              rejectedByUserId:
                userId,
            },
          });

        if (rejected.count !== 1) {
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

  const trade = result.trade;

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

  for (
    const notificationUserId of
    result.notificationUserIds
  ) {
    realtime.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId:
          trade.cinemaId,
        shiftTradeId:
          trade.id,
        resolved: true,
      },
    );
  }

  if (
    trade.offeredByUserId !==
    userId
  ) {
    const display =
      getShiftTradeDisplayData(
        trade,
      );
    const rejectedByName =
      getParticipantName(
        trade.rejectedByUser,
        'En kollega',
      );
    const resultMessage =
      `${rejectedByName} har afvist ${display.jobFunctionName} ` +
      `${formatTradeDateTime(display.startTime)}–${formatTradeDateTime(display.endTime)}.`;

    await notifications.create({
      userId:
        trade.offeredByUserId,
      cinemaId:
        trade.cinemaId,
      title:
        'Direkte vagt afvist',
      message:
        resultMessage,
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
        title:
          'Direkte vagt afvist',
        body:
          resultMessage,
        url:
          getShiftTradeNotificationLink(
            trade.id,
          ),
      },
    );
  }

  return trade;
}
