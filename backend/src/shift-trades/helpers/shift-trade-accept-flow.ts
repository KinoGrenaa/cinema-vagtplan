import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaveStatus,
  ShiftTradeStatus,
} from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  ensureShiftTradeCanBeAccepted,
  resolveShiftTradeActorContext,
  ShiftTradeActor,
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

  const updatedTrade = await prisma.$transaction(
    async (tx) => {
      const trade =
        await tx.shiftTrade.findFirst({
          where: {
            id,
            cinemaId,
          },
        });

      if (!trade) {
        throw new NotFoundException(
          'Vagtbytte blev ikke fundet',
        );
      }

      ensureShiftTradeCanBeAccepted(
        trade,
        userId,
      );

      const claimedTrade =
        await tx.shiftTrade.updateMany({
          where: {
            id,
            cinemaId,
            status: ShiftTradeStatus.OPEN,
          },
          data: {
            status:
              ShiftTradeStatus.ACCEPTED,
            acceptedByUserId: userId,
          },
        });

      if (claimedTrade.count !== 1) {
        throw new ForbiddenException(
          'Vagtbyttet er ikke længere åbent',
        );
      }

      const shift = await tx.shift.findFirst({
        where: {
          id: trade.shiftId,
          cinemaId,
        },
        select: {
          id: true,
          userId: true,
          startTime: true,
          endTime: true,
        },
      });

      if (!shift) {
        throw new NotFoundException(
          'Vagten blev ikke fundet',
        );
      }

      if (
        shift.userId !==
        trade.offeredByUserId
      ) {
        throw new ForbiddenException(
          'Vagten er allerede blevet tildelt en anden',
        );
      }

      if (shift.startTime <= new Date()) {
        throw new ForbiddenException(
          'Vagten er allerede startet',
        );
      }

      const conflictingShift =
        await tx.shift.findFirst({
          where: {
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
            status: LeaveStatus.APPROVED,
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

      const assignedShift =
        await tx.shift.updateMany({
          where: {
            id: trade.shiftId,
            cinemaId,
            userId: trade.offeredByUserId,
          },
          data: {
            userId,
          },
        });

      if (assignedShift.count !== 1) {
        throw new ForbiddenException(
          'Vagten er allerede blevet tildelt en anden',
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

  if (!updatedTrade) {
    throw new NotFoundException(
      'Vagtbytte blev ikke fundet',
    );
  }

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

  await notifications.create({
    userId: updatedTrade.offeredByUserId,
    cinemaId: updatedTrade.cinemaId,
    title: 'Vagt accepteret',
    message:
      'Din tilbudte vagt blev accepteret',
    type: 'SHIFT_ACCEPTED',
    linkUrl: '/my-shifts',
  });
  await push.sendToUserInCinema(
    updatedTrade.offeredByUserId,
    updatedTrade.cinemaId,
    {
      title: 'Vagt accepteret',
      body:
        'Din tilbudte vagt blev accepteret',
      url: '/my-shifts',
    },
  );
  realtime.notifyCinema(
    updatedTrade.cinemaId,
    'shiftsUpdated',
    {
      shiftId: updatedTrade.shiftId,
      acceptedByUserId: userId,
    },
  );

  return updatedTrade;
}
