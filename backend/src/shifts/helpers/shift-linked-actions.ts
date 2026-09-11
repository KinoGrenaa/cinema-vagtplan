import {
  ShiftTradeResolutionReason,
  ShiftTradeStatus,
  ShiftTradeType,
  StaffingRequestStatus,
} from '@prisma/client';
import type {
  Prisma,
} from '@prisma/client';

import {
  getShiftTradeNotificationLink,
} from '../../notifications/helpers/notification-deep-links';
import {
  resolveStaffingRequestNotifications,
} from '../../staffing-requests/helpers/staffing-request-notification-resolution';
import {
  resolveShiftTradeOfferNotifications,
} from '../../shift-trades/helpers/shift-trade-notification-resolution';
import {
  formatShiftTradePeriod,
} from '../../shift-trades/helpers/shift-trade-period';

export type ShiftLinkedActionCancellationNotice = {
  userId: number;
  title: string;
  message: string;
  linkUrl: string;
};
export type ResolvedShiftLinkedActions = {
  tradeIds: number[];
  staffingRequestIds: number[];
  notificationUserIds: number[];
  cancellationNotices: ShiftLinkedActionCancellationNotice[];
};

function getReasonCopy(reason: ShiftTradeResolutionReason) {
  switch (reason) {
    case ShiftTradeResolutionReason.SHIFT_MOVED:
      return 'vagten er blevet flyttet til en anden dato';
    case ShiftTradeResolutionReason.SHIFT_DELETED:
      return 'vagten er blevet slettet';
    case ShiftTradeResolutionReason.SHIFT_UNASSIGNED:
      return 'vagten ikke længere er tildelt den oprindelige medarbejder';
    case ShiftTradeResolutionReason.SHIFT_REASSIGNED:
    default:
      return 'vagten er blevet tildelt en anden medarbejder';
  }
}

async function findPoolRecipientUserIds(
  prisma: Prisma.TransactionClient,
  params: {
    cinemaId: number;
    offeredByUserId: number;
    jobFunctionId: number | null | undefined;
  },
) {
  if (!params.jobFunctionId) {
    return [] as number[];
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        not: params.offeredByUserId,
      },
      isActive: true,
      role: {
        not: 'MASTER',
      },
      cinemaMemberships: {
        some: {
          cinemaId: params.cinemaId,
          isActive: true,
        },
      },
      userJobFunctions: {
        some: {
          cinemaId: params.cinemaId,
          jobFunctionId: params.jobFunctionId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  return users.map((user) => user.id);
}

export async function resolveOpenShiftLinkedActions(
  prisma: Prisma.TransactionClient,
  params: {
    cinemaId: number;
    shiftId: number;
    resolvedByUserId: number;
    resolutionReason: ShiftTradeResolutionReason;
  },
): Promise<ResolvedShiftLinkedActions> {
  const [openTrades, pendingStaffingRequests] = await Promise.all([
    prisma.shiftTrade.findMany({
      where: {
        cinemaId: params.cinemaId,
        shiftId: params.shiftId,
        status: ShiftTradeStatus.OPEN,
      },
      select: {
        id: true,
        type: true,
        offeredByUserId: true,
        targetUserId: true,
        shiftStartTimeSnapshot: true,
        shiftEndTimeSnapshot: true,
        jobFunctionIdSnapshot: true,
        jobFunctionNameSnapshot: true,
        shift: {
          select: {
            startTime: true,
            endTime: true,
            jobFunctionId: true,
            jobFunctionNameSnapshot: true,
          },
        },
      },
    }),
    prisma.staffingRequest.findMany({
      where: {
        cinemaId: params.cinemaId,
        shiftId: params.shiftId,
        status: StaffingRequestStatus.PENDING,
      },
      select: { id: true },
    }),
  ]);
  const tradeIds = openTrades.map((trade) => trade.id);
  const staffingRequestIds = pendingStaffingRequests.map((request) => request.id);
  const resolvedAt = new Date();
  const liveShift = openTrades.find((trade) => trade.shift)?.shift ?? null;

  if (tradeIds.length > 0) {
    await prisma.shiftTrade.updateMany({
      where: {
        cinemaId: params.cinemaId,
        id: { in: tradeIds },
        status: ShiftTradeStatus.OPEN,
      },
      data: {
        status: ShiftTradeStatus.CANCELLED,
        resolvedAt,
        resolvedByUserId: params.resolvedByUserId,
        resolutionReason: params.resolutionReason,
        ...(liveShift
          ? {
              shiftStartTimeSnapshot: liveShift.startTime,
              shiftEndTimeSnapshot: liveShift.endTime,
            }
          : {}),
      },
    });
  }
  if (staffingRequestIds.length > 0) {
    await prisma.staffingRequest.updateMany({
      where: {
        cinemaId: params.cinemaId,
        id: { in: staffingRequestIds },
        status: StaffingRequestStatus.PENDING,
      },
      data: { status: StaffingRequestStatus.CANCELLED },
    });
  }

  const [tradeNotificationUserIds, staffingNotificationUserIds] = await Promise.all([
    resolveShiftTradeOfferNotifications(prisma, params.cinemaId, tradeIds),
    resolveStaffingRequestNotifications(prisma, params.cinemaId, staffingRequestIds),
  ]);

  const cancellationNotices: ShiftLinkedActionCancellationNotice[] = [];
  const reasonCopy = getReasonCopy(params.resolutionReason);

  for (const trade of openTrades) {
    if (
      trade.type !== ShiftTradeType.DIRECT &&
      trade.type !== ShiftTradeType.POOL
    ) {
      continue;
    }

    const startTime = trade.shift?.startTime ?? trade.shiftStartTimeSnapshot;
    const endTime = trade.shift?.endTime ?? trade.shiftEndTimeSnapshot;
    const jobFunctionName =
      trade.shift?.jobFunctionNameSnapshot ?? trade.jobFunctionNameSnapshot;

    if (!startTime || !endTime || !jobFunctionName) {
      continue;
    }

    const linkUrl = getShiftTradeNotificationLink(trade.id);
    const message =
      `Vagttilbuddet på ${jobFunctionName} ${formatShiftTradePeriod(startTime, endTime)} er ikke længere aktuelt, fordi ${reasonCopy}.`;

    if (trade.type === ShiftTradeType.DIRECT && trade.targetUserId) {
      const title = 'Direkte vagttilbud ikke længere aktuelt';
      await prisma.notification.create({
        data: {
          userId: trade.targetUserId,
          cinemaId: params.cinemaId,
          title,
          message,
          type: 'SHIFT_TRADE_CANCELLED',
          isRead: true,
          linkUrl,
        },
      });
      cancellationNotices.push({
        userId: trade.targetUserId,
        title,
        message,
        linkUrl,
      });
      continue;
    }

    if (trade.type !== ShiftTradeType.POOL) {
      continue;
    }

    const recipientUserIds = await findPoolRecipientUserIds(
      prisma,
      {
        cinemaId: params.cinemaId,
        offeredByUserId: trade.offeredByUserId,
        jobFunctionId:
          trade.shift?.jobFunctionId ??
          trade.jobFunctionIdSnapshot,
      },
    );
    const title = 'Vagtpuljetilbud ikke længere aktuelt';

    for (const recipientUserId of recipientUserIds) {
      await prisma.notification.create({
        data: {
          userId: recipientUserId,
          cinemaId: params.cinemaId,
          title,
          message,
          type: 'SHIFT_TRADE',
          isRead: true,
          linkUrl,
        },
      });
      cancellationNotices.push({
        userId: recipientUserId,
        title,
        message,
        linkUrl,
      });
    }
  }

  return {
    tradeIds,
    staffingRequestIds,
    notificationUserIds: [
      ...new Set([
        ...tradeNotificationUserIds,
        ...staffingNotificationUserIds,
        ...cancellationNotices.map((notice) => notice.userId),
      ]),
    ],
    cancellationNotices,
  };
}
