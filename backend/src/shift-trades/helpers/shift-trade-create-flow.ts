import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  normalizeShiftTradeCreateInput,
  ShiftTradeCreateInput,
} from './shift-trade-input';
import {
  shiftTradeInclude,
} from './shift-trade-service-helpers';

type ShiftTradeCreateFlowDeps = {
  prisma: PrismaService;
  realtime: RealtimeGateway;
  notifications: NotificationsService;
  push: PushService;
};

function getActiveCinemaUserFilter(
  userId: number,
  cinemaId: number,
) {
  return {
    id: userId,
    isActive: true,
    role: {
      not: 'MASTER' as const,
    },
    cinemaMemberships: {
      some: {
        cinemaId,
        isActive: true,
      },
    },
  };
}

export async function createShiftTrade(
  deps: ShiftTradeCreateFlowDeps,
  input: ShiftTradeCreateInput,
) {
  const {
    prisma,
    realtime,
    notifications,
    push,
  } = deps;
  const data =
    normalizeShiftTradeCreateInput(input);

  const cinema =
    await prisma.cinema.findUnique({
      where: {
        id: data.cinemaId,
      },
    });

  if (!cinema) {
    throw new NotFoundException(
      'Biograf blev ikke fundet',
    );
  }

  if (
    data.type === ShiftTradeType.POOL &&
    !cinema.allowShiftTradePool
  ) {
    throw new ForbiddenException(
      'Vagtpulje er deaktiveret for denne biograf',
    );
  }

  if (
    data.type === ShiftTradeType.DIRECT &&
    !cinema.allowShiftTradeDirect
  ) {
    throw new ForbiddenException(
      'Direkte vagtbytte er deaktiveret for denne biograf',
    );
  }

  const offeredByUser =
    await prisma.user.findFirst({
      where: getActiveCinemaUserFilter(
        data.offeredByUserId,
        data.cinemaId,
      ),
      select: {
        id: true,
      },
    });

  if (!offeredByUser) {
    throw new ForbiddenException(
      'Du er ikke aktivt tilknyttet denne biograf',
    );
  }

  if (data.targetUserId) {
    const targetUser =
      await prisma.user.findFirst({
        where: getActiveCinemaUserFilter(
          data.targetUserId,
          data.cinemaId,
        ),
        select: {
          id: true,
        },
      });

    if (!targetUser) {
      throw new ForbiddenException(
        'Modtageren er ikke aktivt tilknyttet denne biograf',
      );
    }
  }

  const trade = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`
          SELECT pg_advisory_xact_lock(
            53001,
            ${data.shiftId}
          )
        `,
      );

      const shift =
        await tx.shift.findFirst({
          where: {
            id: data.shiftId,
            cinemaId: data.cinemaId,
          },
          select: {
            id: true,
            userId: true,
            startTime: true,
          },
        });

      if (!shift) {
        throw new NotFoundException(
          'Vagten blev ikke fundet i denne biograf',
        );
      }

      if (
        shift.userId !==
        data.offeredByUserId
      ) {
        throw new ForbiddenException(
          'Du kan kun bytte dine egne vagter',
        );
      }

      if (
        shift.startTime <= new Date()
      ) {
        throw new ForbiddenException(
          'Vagten er allerede startet',
        );
      }

      const existingOpenTrade =
        await tx.shiftTrade.findFirst({
          where: {
            shiftId: data.shiftId,
            status:
              ShiftTradeStatus.OPEN,
          },
          select: {
            id: true,
          },
        });

      if (existingOpenTrade) {
        throw new ConflictException(
          'Vagten er allerede tilbudt til bytte',
        );
      }

      return tx.shiftTrade.create({
        data: {
          shiftId: data.shiftId,
          offeredByUserId:
            data.offeredByUserId,
          cinemaId: data.cinemaId,
          type: data.type,
          targetUserId:
            data.targetUserId ?? null,
          message: data.message ?? null,
        },
        include: shiftTradeInclude,
      });
    },
  );

  realtime.notifyCinema(
    trade.cinemaId,
    'shiftTradesUpdated',
    trade,
  );

  if (
    trade.type === ShiftTradeType.DIRECT &&
    trade.targetUserId
  ) {
    realtime.notifyCinema(
      trade.cinemaId,
      'newDirectShiftTrade',
      trade,
    );

    await notifications.create({
      userId: trade.targetUserId,
      cinemaId: trade.cinemaId,
      title: 'Ny direkte vagt',
      message:
        'Du har fået tilbudt en vagt direkte',
      type: 'SHIFT_DIRECT',
      linkUrl: '/my-shifts',
    });

    await push.sendToUserInCinema(
      trade.targetUserId,
      trade.cinemaId,
      {
        title: 'Ny direkte vagt',
        body:
          'Du har fået tilbudt en vagt direkte',
        url: '/my-shifts',
      },
    );
  }

  return trade;
}
