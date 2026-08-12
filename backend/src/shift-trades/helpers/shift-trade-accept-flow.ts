import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaveStatus,
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
  acquireShiftAdvisoryLock,
  SHIFT_RECORD_LOCK_NAMESPACE,
} from '../../shifts/helpers/shift-advisory-lock';
import {
  ensureShiftTradeCanBeAccepted,
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
  getShiftTradeDisplayData,
  shiftTradeInclude,
} from './shift-trade-service-helpers';

type ShiftTradeAcceptFlowDeps = {
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

export async function acceptShiftTrade(
  deps: ShiftTradeAcceptFlowDeps,
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
        const initialTrade =
          await tx.shiftTrade.findFirst({
            where: {
              id,
              cinemaId,
            },
          });

        if (!initialTrade) {
          throw new NotFoundException(
            'Vagtbytte blev ikke fundet',
          );
        }

        ensureShiftTradeCanBeAccepted(
          initialTrade,
          userId,
        );

        if (!initialTrade.shiftId) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere aktuelt',
          );
        }

        await acquireShiftAdvisoryLock(
          tx,
          SHIFT_RECORD_LOCK_NAMESPACE,
          initialTrade.shiftId,
        );

        const trade =
          await tx.shiftTrade.findFirst({
            where: {
              id,
              cinemaId,
              status:
                ShiftTradeStatus.OPEN,
            },
          });

        if (!trade) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere åbent',
          );
        }

        ensureShiftTradeCanBeAccepted(
          trade,
          userId,
        );

        if (!trade.shiftId) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere aktuelt',
          );
        }

        const shift =
          await tx.shift.findFirst({
            where: {
              id: trade.shiftId,
              cinemaId,
            },
            select: {
              id: true,
              userId: true,
              startTime: true,
              endTime: true,
              jobFunctionId: true,
            },
          });

        if (!shift) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere aktuelt',
          );
        }

        if (
          shift.userId !==
          trade.offeredByUserId
        ) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere aktuelt, fordi vagten er blevet ændret',
          );
        }

        await ensureShiftTradeUserQualified(
          tx,
          {
            cinemaId,
            userId,
            jobFunctionId:
              shift.jobFunctionId,
          },
        );

        if (
          shift.startTime <=
          new Date()
        ) {
          throw new ForbiddenException(
            'Vagten er allerede startet',
          );
        }

        const conflictingShift =
          await tx.shift.findFirst({
            where: {
              cinemaId,
              userId,
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
            select: {
              id: true,
            },
          });

        if (conflictingShift) {
          throw new ForbiddenException(
            'Du har allerede en vagt i dette tidsrum',
          );
        }

        const approvedLeave =
          await tx.leaveRequest.findFirst({
            where: {
              cinemaId,
              userId,
              status:
                LeaveStatus.APPROVED,
              startDate: {
                lt: shift.endTime,
              },
              endDate: {
                gt: shift.startTime,
              },
            },
            select: {
              id: true,
            },
          });

        if (approvedLeave) {
          throw new ForbiddenException(
            'Du har godkendt fravær i dette tidsrum',
          );
        }

        const claimedTrade =
          await tx.shiftTrade.updateMany({
            where: {
              id,
              cinemaId,
              status:
                ShiftTradeStatus.OPEN,
              shiftId:
                trade.shiftId,
              offeredByUserId:
                trade.offeredByUserId,
            },
            data: {
              status:
                ShiftTradeStatus.ACCEPTED,
              acceptedByUserId:
                userId,
            },
          });

        if (
          claimedTrade.count !== 1
        ) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere åbent',
          );
        }

        const assignedShift =
          await tx.shift.updateMany({
            where: {
              id: trade.shiftId,
              cinemaId,
              userId:
                trade.offeredByUserId,
            },
            data: {
              userId,
            },
          });

        if (
          assignedShift.count !== 1
        ) {
          throw new ForbiddenException(
            'Vagtbyttet er ikke længere aktuelt, fordi vagten er blevet ændret',
          );
        }

        const notificationUserIds =
          await resolveShiftTradeOfferNotifications(
            tx,
            cinemaId,
            [id],
          );

        const updatedTrade =
          await tx.shiftTrade.findUnique({
            where: {
              id,
            },
            include:
              shiftTradeInclude,
          });

        if (!updatedTrade) {
          throw new NotFoundException(
            'Vagtbytte blev ikke fundet',
          );
        }

        return {
          updatedTrade,
          notificationUserIds,
        };
      },
    );

  const updatedTrade =
    result.updatedTrade;

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

  for (
    const notificationUserId of
    result.notificationUserIds
  ) {
    realtime.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId:
          updatedTrade.cinemaId,
        shiftTradeId:
          updatedTrade.id,
        resolved: true,
      },
    );
  }

  const display =
    getShiftTradeDisplayData(
      updatedTrade,
    );
  const acceptedByName =
    getParticipantName(
      updatedTrade.acceptedByUser,
      'En kollega',
    );
  const resultMessage =
    `${acceptedByName} har accepteret ${display.jobFunctionName} ` +
    `${formatTradeDateTime(display.startTime)}–${formatTradeDateTime(display.endTime)}.`;

  await notifications.create({
    userId:
      updatedTrade.offeredByUserId,
    cinemaId:
      updatedTrade.cinemaId,
    title:
      updatedTrade.type ===
      ShiftTradeType.DIRECT
        ? 'Direkte vagt accepteret'
        : 'Vagt fra puljen accepteret',
    message:
      resultMessage,
    type:
      updatedTrade.type ===
      ShiftTradeType.DIRECT
        ? 'SHIFT_ACCEPTED'
        : 'SHIFT_TRADE',
    linkUrl:
      getShiftTradeNotificationLink(
        updatedTrade.id,
      ),
  });
  await push.sendToUserInCinema(
    updatedTrade.offeredByUserId,
    updatedTrade.cinemaId,
    {
      title:
        updatedTrade.type ===
        ShiftTradeType.DIRECT
          ? 'Direkte vagt accepteret'
          : 'Vagt fra puljen accepteret',
      body:
        resultMessage,
      url:
        getShiftTradeNotificationLink(
          updatedTrade.id,
        ),
    },
  );
  realtime.notifyCinema(
    updatedTrade.cinemaId,
    'shiftsUpdated',
    {
      shiftId:
        updatedTrade.shiftId,
      acceptedByUserId:
        userId,
    },
  );

  return updatedTrade;
}
