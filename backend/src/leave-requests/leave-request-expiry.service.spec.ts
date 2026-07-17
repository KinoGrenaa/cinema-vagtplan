import { LeaveRequestExpiryService } from './leave-request-expiry.service';
import {
  getCopenhagenTodayStart,
  getCopenhagenTomorrowStart,
} from './helpers/leave-request-service-helpers';
import { notifyLeaveRequestsUpdated } from './helpers/leave-request-processing-helpers';

jest.mock('./helpers/leave-request-processing-helpers', () => ({
  notifyLeaveRequestsUpdated: jest.fn(),
}));

describe('Copenhagen leave request expiry boundaries', () => {
  it.each([
    [
      'vintertid',
      '2026-01-15T12:00:00.000Z',
      '2026-01-14T23:00:00.000Z',
    ],
    [
      'sommertid',
      '2026-07-17T12:00:00.000Z',
      '2026-07-16T22:00:00.000Z',
    ],
    [
      'start på sommertid',
      '2026-03-29T12:00:00.000Z',
      '2026-03-28T23:00:00.000Z',
    ],
    [
      'slut på sommertid',
      '2026-10-25T12:00:00.000Z',
      '2026-10-24T22:00:00.000Z',
    ],
  ])(
    'beregner dansk midnat korrekt ved %s',
    (_label, referenceDate, expectedStart) => {
      expect(
        getCopenhagenTodayStart(new Date(referenceDate)).toISOString(),
      ).toBe(expectedStart);
    },
  );

  it('bevarer grænsen for tidligst tilladte nye fraværsdato', () => {
    expect(
      getCopenhagenTomorrowStart(
        new Date('2026-07-17T12:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-07-17T22:00:00.000Z');
  });
});

describe('LeaveRequestExpiryService', () => {
  const findMany = jest.fn();
  const updateMany = jest.fn();
  const prisma = {
    leaveRequest: {
      findMany,
      updateMany,
    },
  };
  const realtimeGateway = {};

  let service: LeaveRequestExpiryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeaveRequestExpiryService(
      prisma as never,
      realtimeGateway as never,
    );
  });

  it('udløber kun ansøgninger fra før den aktuelle danske dato', async () => {
    findMany.mockResolvedValue([
      {
        id: 11,
        cinemaId: 2,
      },
    ]);
    updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.expirePendingLeaveRequests({
      referenceDate: new Date('2026-07-17T12:00:00.000Z'),
      cinemaId: 2,
    });

    const expectedBoundary = new Date('2026-07-16T22:00:00.000Z');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        startDate: {
          lt: expectedBoundary,
        },
        cinemaId: 2,
      },
      select: {
        id: true,
        cinemaId: true,
      },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [11],
        },
        status: 'PENDING',
        startDate: {
          lt: expectedBoundary,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });
    expect(notifyLeaveRequestsUpdated).toHaveBeenCalledWith(
      realtimeGateway,
      2,
    );
    expect(result).toBe(1);
  });

  it('lader dagens ansøgninger forblive afventende hele den danske dag', async () => {
    findMany.mockResolvedValue([]);

    const result = await service.expirePendingLeaveRequests({
      referenceDate: new Date('2026-07-17T21:59:59.999Z'),
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        startDate: {
          lt: new Date('2026-07-16T22:00:00.000Z'),
        },
      },
      select: {
        id: true,
        cinemaId: true,
      },
    });
    expect(updateMany).not.toHaveBeenCalled();
    expect(notifyLeaveRequestsUpdated).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it('skifter til næste danske dato efter midnat', async () => {
    findMany.mockResolvedValue([]);

    await service.expirePendingLeaveRequests({
      referenceDate: new Date('2026-07-17T22:00:00.000Z'),
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        startDate: {
          lt: new Date('2026-07-17T22:00:00.000Z'),
        },
      },
      select: {
        id: true,
        cinemaId: true,
      },
    });
  });
});
