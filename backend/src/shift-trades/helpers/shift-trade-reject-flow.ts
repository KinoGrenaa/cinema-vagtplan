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
  ensureShiftTradeUserQualified,
} from './shift-trade-qualification';
import {
  acquireShiftAdvisoryLock,
  SHIFT_RECORD_LOCK_NAMESPACE,
} from '../../shifts/helpers/shift-advisory-lock';
import {
  formatShiftTradePeriod,
} from './shift-trade-period';
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
            include: {
              shift: {
                select: {
                  userId: true,
                  startTime: true,
                  endTime: true,
                  jobFunctionId: true,
                },
              },
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

        if (
          existingTrade.type ===
          ShiftTradeType.POOL
        ) {
          if (!existingTrade.shiftId) {
            throw new ForbiddenException(
              'Vagtbyttet er ikke længere aktuelt',
            );
          }

          await acquireShiftAdvisoryLock(
            tx,
            SHIFT_RECORD_LOCK_NAMESPACE,
            existingTrade.shiftId,
          );

          const currentTrade =
            await tx.shiftTrade.findFirst({
              where: {
                id,
                cinemaId,
                status:
                  ShiftTradeStatus.OPEN,
              },
              include: {
                shift: {
                  select: {
                    userId: true,
                    startTime: true,
                    endTime: true,
                    jobFunctionId: true,
                  },
                },
              },
            });

          if (!currentTrade) {
            throw new ForbiddenException(
              'Vagtbyttet er ikke længere åbent',
            );
          }

          ensureShiftTradeCanBeRejected(
            currentTrade,
            userId,
          );

          if (
            !currentTrade.shift ||
            currentTrade.shift.userId !==
              currentTrade.offeredByUserId
          ) {
            throw new ForbiddenException(
              'Vagtbyttet er ikke længere aktuelt, fordi vagten er blevet ændret',
            );
          }

          if (
            currentTrade.shift.startTime <=
            new Date()
          ) {
            throw new ForbiddenException(
              'Vagten er allerede startet',
            );
          }

          await ensureShiftTradeUserQualified(
            tx,
            {
              cinemaId,
              userId,
              jobFunctionId:
                currentTrade.shift.jobFunctionId,
            },
          );

          const previousDecline =
            await tx.shiftTradeDecline.findUnique({
              where: {
                shiftTradeId_userId: {
                  shiftTradeId: id,
                  userId,
                },
              },
              select: {
                id: true,
              },
            });

          if (previousDecline) {
            throw new ForbiddenException(
              'Du har allerede takket nej til denne vagt',
            );
          }

          try {
            await tx.shiftTradeDecline.create({
              data: {
                shiftTradeId: id,
                userId,
              },
            });
          } catch (error) {
            if (
              (error as { code?: string } | null)
                ?.code === 'P2002'
            ) {
              throw new ForbiddenException(
                'Du har allerede takket nej til denne vagt',
              );
            }
            throw error;
          }

          const [trade, declinedByUser] =
            await Promise.all([
              tx.shiftTrade.findUnique({
                where: {
                  id,
                },
                include:
                  shiftTradeInclude,
              }),
              tx.user.findUnique({
                where: {
                  id: userId,
                },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              }),
            ]);

          if (!trade) {
            throw new NotFoundException(
              'Vagtbytte blev ikke fundet',
            );
          }

          return {
            trade,
            notificationUserIds:
              [] as number[],
            personalPoolDecline: true,
            declinedByUser,
          };
        }

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
              resolvedAt: new Date(),
              resolvedByUserId:
                userId,
              resolutionReason:
                'REJECTED',
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
          personalPoolDecline: false,
          declinedByUser: null,
        };
      },
    );

  const trade = result.trade;

  realtime.notifyCinema(
    trade.cinemaId,
    'shiftTradesUpdated',
    trade,
  );

  if (result.personalPoolDecline) {
    const display =
      getShiftTradeDisplayData(
        trade,
      );
    const declinedByName =
      getParticipantName(
        result.declinedByUser,
        'En kollega',
      );
    const resultMessage =
      `${declinedByName} har takket nej til ${display.jobFunctionName} ` +
      `${formatShiftTradePeriod(display.startTime, display.endTime)}.`;
    const linkUrl = trade.shiftId
      ? `/my-shifts?shiftId=${trade.shiftId}`
      : '/my-shifts';

    await notifications.create({
      userId:
        trade.offeredByUserId,
      cinemaId:
        trade.cinemaId,
      title:
        'Kollega har takket nej til vagt i puljen',
      message:
        resultMessage,
      type: 'SHIFT_TRADE',
      linkUrl,
    });
    await push.sendToUserInCinema(
      trade.offeredByUserId,
      trade.cinemaId,
      {
        title:
          'Kollega har takket nej til vagt i puljen',
        body:
          resultMessage,
        url:
          linkUrl,
      },
    );
    return trade;
  }

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
      `${formatShiftTradePeriod(display.startTime, display.endTime)}.`;

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
