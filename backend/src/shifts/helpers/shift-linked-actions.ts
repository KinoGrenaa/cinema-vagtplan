import {
  ShiftTradeStatus,
  StaffingRequestStatus,
} from '@prisma/client';
import type {
  Prisma,
} from '@prisma/client';

import {
  resolveStaffingRequestNotifications,
} from '../../staffing-requests/helpers/staffing-request-notification-resolution';
import {
  resolveShiftTradeOfferNotifications,
} from '../../shift-trades/helpers/shift-trade-notification-resolution';

export type ResolvedShiftLinkedActions = {
  tradeIds: number[];
  staffingRequestIds: number[];
  notificationUserIds: number[];
};

export async function resolveOpenShiftLinkedActions(
  prisma: Prisma.TransactionClient,
  params: {
    cinemaId: number;
    shiftId: number;
  },
): Promise<ResolvedShiftLinkedActions> {
  const [
    openTrades,
    pendingStaffingRequests,
  ] = await Promise.all([
    prisma.shiftTrade.findMany({
      where: {
        cinemaId:
          params.cinemaId,
        shiftId:
          params.shiftId,
        status:
          ShiftTradeStatus.OPEN,
      },
      select: {
        id: true,
      },
    }),
    prisma.staffingRequest.findMany({
      where: {
        cinemaId:
          params.cinemaId,
        shiftId:
          params.shiftId,
        status:
          StaffingRequestStatus.PENDING,
      },
      select: {
        id: true,
      },
    }),
  ]);

  const tradeIds =
    openTrades.map(
      (trade) => trade.id,
    );
  const staffingRequestIds =
    pendingStaffingRequests.map(
      (request) => request.id,
    );

  if (tradeIds.length > 0) {
    await prisma.shiftTrade.updateMany({
      where: {
        cinemaId:
          params.cinemaId,
        id: {
          in: tradeIds,
        },
        status:
          ShiftTradeStatus.OPEN,
      },
      data: {
        status:
          ShiftTradeStatus.CANCELLED,
      },
    });
  }

  if (
    staffingRequestIds.length >
    0
  ) {
    await prisma.staffingRequest.updateMany({
      where: {
        cinemaId:
          params.cinemaId,
        id: {
          in: staffingRequestIds,
        },
        status:
          StaffingRequestStatus.PENDING,
      },
      data: {
        status:
          StaffingRequestStatus.CANCELLED,
      },
    });
  }

  const [
    tradeNotificationUserIds,
    staffingNotificationUserIds,
  ] = await Promise.all([
    resolveShiftTradeOfferNotifications(
      prisma,
      params.cinemaId,
      tradeIds,
    ),
    resolveStaffingRequestNotifications(
      prisma,
      params.cinemaId,
      staffingRequestIds,
    ),
  ]);

  return {
    tradeIds,
    staffingRequestIds,
    notificationUserIds: [
      ...new Set([
        ...tradeNotificationUserIds,
        ...staffingNotificationUserIds,
      ]),
    ],
  };
}
