import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShiftTradeStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { shiftTradeInclude } from './shift-trade-service-helpers';

type ShiftTradeCancelFlowDeps = {
  prisma: PrismaService;
  realtime: RealtimeGateway;
};

export async function cancelShiftTrade(
  deps: ShiftTradeCancelFlowDeps,
  id: number,
  userId?: number,
) {
  const { prisma, realtime } = deps;

  const existingTrade = await prisma.shiftTrade.findUnique({
    where: { id },
  });

  if (!existingTrade) {
    throw new NotFoundException('Vagtbytte blev ikke fundet');
  }

  if (userId && existingTrade.offeredByUserId !== userId) {
    throw new ForbiddenException('Du kan kun annullere dine egne vagtbytter');
  }

  if (existingTrade.status !== ShiftTradeStatus.OPEN) {
    throw new ForbiddenException('Vagtbyttet er ikke længere åbent');
  }

  const trade = await prisma.shiftTrade.update({
    where: { id },
    data: {
      status: ShiftTradeStatus.CANCELLED,
    },
    include: shiftTradeInclude,
  });

  realtime.notifyCinema(trade.cinemaId, 'shiftTradesUpdated', trade);

  return trade;
}
