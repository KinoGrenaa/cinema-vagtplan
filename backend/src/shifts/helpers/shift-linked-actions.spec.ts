import {
  ShiftTradeResolutionReason,
  ShiftTradeStatus,
  ShiftTradeType,
  StaffingRequestStatus,
} from '@prisma/client';

import { resolveStaffingRequestNotifications } from '../../staffing-requests/helpers/staffing-request-notification-resolution';
import { resolveShiftTradeOfferNotifications } from '../../shift-trades/helpers/shift-trade-notification-resolution';
import { resolveOpenShiftLinkedActions } from './shift-linked-actions';

jest.mock(
  '../../staffing-requests/helpers/staffing-request-notification-resolution',
);
jest.mock(
  '../../shift-trades/helpers/shift-trade-notification-resolution',
);

describe('shift linked actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveShiftTradeOfferNotifications as jest.Mock).mockResolvedValue([
      11,
    ]);
    (resolveStaffingRequestNotifications as jest.Mock).mockResolvedValue([
      11,
      12,
    ]);
  });

  it('afslutter åbne bytter og bemandingsforespørgsler samlet', async () => {
    const prisma = {
      shiftTrade: {
        findMany: jest.fn().mockResolvedValue([
          { id: 31 },
          { id: 32 },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      staffingRequest: {
        findMany: jest.fn().mockResolvedValue([
          { id: 41 },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(
      resolveOpenShiftLinkedActions(
        prisma as never,
        {
          cinemaId: 7,
          shiftId: 21,
          resolvedByUserId: 99,
          resolutionReason:
            ShiftTradeResolutionReason.SHIFT_REASSIGNED,
        },
      ),
    ).resolves.toEqual({
      tradeIds: [31, 32],
      staffingRequestIds: [41],
      notificationUserIds: [11, 12],
      cancellationNotices: [],
    });

    expect(prisma.shiftTrade.updateMany).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        id: { in: [31, 32] },
        status: ShiftTradeStatus.OPEN,
      },
      data: {
        status: ShiftTradeStatus.CANCELLED,
        resolvedAt: expect.any(Date),
        resolvedByUserId: 99,
        resolutionReason:
          ShiftTradeResolutionReason.SHIFT_REASSIGNED,
      },
    });
    expect(prisma.staffingRequest.updateMany).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        id: { in: [41] },
        status: StaffingRequestStatus.PENDING,
      },
      data: {
        status: StaffingRequestStatus.CANCELLED,
      },
    });
    expect(resolveShiftTradeOfferNotifications).toHaveBeenCalledWith(
      prisma,
      7,
      [31, 32],
    );
    expect(resolveStaffingRequestNotifications).toHaveBeenCalledWith(
      prisma,
      7,
      [41],
    );
  });
  it('notificerer kvalificerede modtagere når et åbent puljetilbud bortfalder ved adminændring', async () => {
    const startTime = new Date('2026-09-13T07:00:00.000Z');
    const endTime = new Date('2026-09-13T15:30:00.000Z');
    const prisma = {
      shiftTrade: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 51,
            type: ShiftTradeType.POOL,
            offeredByUserId: 21,
            targetUserId: null,
            shiftStartTimeSnapshot: startTime,
            shiftEndTimeSnapshot: endTime,
            jobFunctionIdSnapshot: 8,
            jobFunctionNameSnapshot: 'A Vagt Weekend',
            shift: {
              startTime,
              endTime,
              jobFunctionId: 8,
              jobFunctionNameSnapshot: 'A Vagt Weekend',
            },
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      staffingRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 31 },
          { id: 32 },
        ]),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    (resolveShiftTradeOfferNotifications as jest.Mock).mockResolvedValue([]);
    (resolveStaffingRequestNotifications as jest.Mock).mockResolvedValue([]);

    const result = await resolveOpenShiftLinkedActions(
      prisma as never,
      {
        cinemaId: 7,
        shiftId: 41,
        resolvedByUserId: 99,
        resolutionReason: ShiftTradeResolutionReason.SHIFT_MOVED,
      },
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { not: 21 },
        isActive: true,
        role: { not: 'MASTER' },
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
          },
        },
        userJobFunctions: {
          some: {
            cinemaId: 7,
            jobFunctionId: 8,
          },
        },
      },
      select: { id: true },
    });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 31,
        cinemaId: 7,
        title: 'Vagtpuljetilbud ikke længere aktuelt',
        type: 'SHIFT_TRADE',
        isRead: true,
        linkUrl: '/shift-trades?tradeId=51',
      }),
    });
    expect(result.notificationUserIds).toEqual([31, 32]);
    expect(result.cancellationNotices).toHaveLength(2);
    expect(result.cancellationNotices[0].message).toContain(
      'vagten er blevet flyttet til en anden dato',
    );
  });

});
