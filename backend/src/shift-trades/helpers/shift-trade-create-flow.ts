import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ShiftTradeType } from '@prisma/client';

import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { shiftTradeInclude } from './shift-trade-service-helpers';

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
    OR: [
      {
        cinemaId,
      },
      {
        cinemaMemberships: {
          some: {
            cinemaId,
            isActive: true,
          },
        },
      },
    ],
  };
}

export async function createShiftTrade(
  deps: ShiftTradeCreateFlowDeps,
  data: {
    shiftId: number;
    offeredByUserId: number;
    cinemaId: number;
    type?: ShiftTradeType;
    targetUserId?: number;
    message?: string;
  },
) {
  const {
    prisma,
    realtime,
    notifications,
    push,
  } = deps;

  const cinema = await prisma.cinema.findUnique({
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

  const offeredByUser = await prisma.user.findFirst({
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

  const shift = await prisma.shift.findFirst({
    where: {
      id: data.shiftId,
      cinemaId: data.cinemaId,
    },
  });

  if (!shift) {
    throw new NotFoundException(
      'Vagten blev ikke fundet i denne biograf',
    );
  }

  if (shift.userId !== data.offeredByUserId) {
    throw new ForbiddenException(
      'Du kan kun bytte dine egne vagter',
    );
  }

  if (data.targetUserId) {
    const targetUser = await prisma.user.findFirst({
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

  const trade = await prisma.shiftTrade.create({
    data: {
      shiftId: data.shiftId,
      offeredByUserId: data.offeredByUserId,
      cinemaId: data.cinemaId,
      type: data.type ?? ShiftTradeType.POOL,
      targetUserId: data.targetUserId ?? null,
      message: data.message ?? null,
    },
    include: shiftTradeInclude,
  });

  realtime.notifyCinema(
    trade.cinemaId,
    'shiftTradesUpdated',
    trade,
  );

  if (trade.type === ShiftTradeType.DIRECT) {
    realtime.notifyCinema(
      trade.cinemaId,
      'newDirectShiftTrade',
      trade,
    );

    if (trade.targetUserId) {
      await notifications.create({
        userId: trade.targetUserId,
        cinemaId: trade.cinemaId,
        title: 'Ny direkte vagt',
        message: 'Du har fået tilbudt en vagt direkte',
        type: 'SHIFT_DIRECT',
        linkUrl: '/my-shifts',
      });

      await push.sendToUser(trade.targetUserId, {
        title: 'Ny direkte vagt',
        body: 'Du har fået tilbudt en vagt direkte',
        url: '/my-shifts',
      });
    }
  }

  return trade;
}
