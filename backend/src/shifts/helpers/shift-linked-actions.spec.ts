import {
  ShiftTradeStatus,
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
        },
      ),
    ).resolves.toEqual({
      tradeIds: [31, 32],
      staffingRequestIds: [41],
      notificationUserIds: [11, 12],
    });

    expect(prisma.shiftTrade.updateMany).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        id: { in: [31, 32] },
        status: ShiftTradeStatus.OPEN,
      },
      data: {
        status: ShiftTradeStatus.CANCELLED,
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
});
