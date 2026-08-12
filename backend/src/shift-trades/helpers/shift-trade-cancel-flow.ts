import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ShiftTradeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  resolveShiftTradeActorContext,
  ShiftTradeActor,
} from './shift-trade-accept-validation';
import {
  resolveShiftTradeOfferNotifications,
} from './shift-trade-notification-resolution';
import { shiftTradeInclude } from './shift-trade-service-helpers';

type ShiftTradeCancelFlowDeps = {
  prisma: PrismaService;
  realtime: RealtimeGateway;
};

export async function cancelShiftTrade(
  deps: ShiftTradeCancelFlowDeps,
  id: number,
  actor: ShiftTradeActor,
) {
  const {
    prisma,
    realtime,
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

  return result.trade;
}
