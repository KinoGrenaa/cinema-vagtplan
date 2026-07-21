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
            offeredByUserId: userId,
            status: ShiftTradeStatus.OPEN,
          },
          data: {
            status:
              ShiftTradeStatus.CANCELLED,
          },
        });

      if (cancelled.count !== 1) {
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

  return trade;
}
