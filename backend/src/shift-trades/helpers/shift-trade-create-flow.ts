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
import {
  getShiftTradeNotificationLink,
} from '../../notifications/helpers/notification-deep-links';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../../push/push.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  assertShiftHasNoActiveTimeEntry,
} from '../../shifts/helpers/shift-time-entry-lock';
import {
  normalizeShiftTradeCreateInput,
  ShiftTradeCreateInput,
} from './shift-trade-input';
import {
  shiftTradeInclude,
} from './shift-trade-service-helpers';
import {
  ensureShiftTradeUserQualified,
} from './shift-trade-qualification';

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
          SELECT CAST(COUNT(*) AS integer) AS "lockAcquired"
          FROM pg_advisory_xact_lock(
            CAST(53001 AS integer),
            CAST(${data.shiftId} AS integer)
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
            endTime: true,
            jobFunctionId: true,
            jobFunctionNameSnapshot: true,
            jobFunctionColorSnapshot: true,
          },
        });

      if (!shift) {
        throw new NotFoundException(
          'Vagten blev ikke fundet i denne biograf',
        );
      }

      await assertShiftHasNoActiveTimeEntry(
        tx,
        {
          cinemaId: data.cinemaId,
          shiftId: data.shiftId,
          message:
            'Vagten kan ikke sendes i bytte, fordi der findes en tidsregistrering.',
        },
      );

      if (
        shift.userId !==
        data.offeredByUserId
      ) {
        throw new ForbiddenException(
          'Vagten er blevet ændret. Genindlæs og prøv igen.',
        );
      }

      if (
        data.targetUserId
      ) {
        await ensureShiftTradeUserQualified(
          tx,
          {
            cinemaId:
              data.cinemaId,
            userId:
              data.targetUserId,
            jobFunctionId:
              shift.jobFunctionId,
          },
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
          shiftStartTimeSnapshot:
            shift.startTime,
          shiftEndTimeSnapshot:
            shift.endTime,
          jobFunctionIdSnapshot:
            shift.jobFunctionId,
          jobFunctionNameSnapshot:
            shift.jobFunctionNameSnapshot,
          jobFunctionColorSnapshot:
            shift.jobFunctionColorSnapshot,
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

    await push.sendToUserInCinema(
      trade.targetUserId,
      trade.cinemaId,
      {
        title: 'Ny direkte vagt',
        body:
          'Du har fået tilbudt en vagt direkte',
        url:
          getShiftTradeNotificationLink(
            trade.id,
          ),
      },
    );
  }

  return trade;
}
