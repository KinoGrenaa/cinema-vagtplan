import { BadRequestException } from '@nestjs/common';
import { PredictiveStaffingService } from './predictive-staffing.service';

describe('PredictiveStaffingService', () => {
  let prisma: {
    movieShowing: {
      count: jest.Mock;
    };
    shift: {
      count: jest.Mock;
    };
    staffingRequest: {
      count: jest.Mock;
    };
  };
  let service: PredictiveStaffingService;

  beforeEach(() => {
    prisma = {
      movieShowing: {
        count: jest.fn(),
      },
      shift: {
        count: jest.fn(),
      },
      staffingRequest: {
        count: jest.fn(),
      },
    };

    service =
      new PredictiveStaffingService(
        prisma as never,
      );
  });

  it('uses overlapping intervals and Copenhagen peak time', async () => {
    prisma.movieShowing.count.mockResolvedValue(
      6,
    );
    prisma.shift.count.mockResolvedValue(2);
    prisma.staffingRequest.count.mockResolvedValue(
      5,
    );

    const start = new Date(
      '2026-07-24T17:00:00.000Z',
    );
    const end = new Date(
      '2026-07-24T22:00:00.000Z',
    );

    await expect(
      service.predictStaffingPressure({
        cinemaId: 7,
        startTime: start,
        endTime: end,
      }),
    ).resolves.toEqual({
      level: 'CRITICAL',
      score: 275,
      reasoning: [
        '6 filmvisninger i perioden',
        '2 vagter planlagt',
        'Weekend pressure detected',
        'Evening peak pressure',
        'High movie activity',
        'Potential understaffing detected',
        'Recent emergency staffing trend detected',
        'Predicted staffing pressure: CRITICAL',
      ],
    });

    expect(
      prisma.movieShowing.count,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        startTime: {
          lt: end,
        },
        endTime: {
          gt: start,
        },
      },
    });
    expect(
      prisma.staffingRequest.count,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        type: 'EMERGENCY',
        createdAt: {
          gte: new Date(
            '2026-07-17T17:00:00.000Z',
          ),
          lt: start,
        },
      },
    });
  });

  it('uses Europe/Copenhagen rather than server-local hour', async () => {
    prisma.movieShowing.count.mockResolvedValue(
      0,
    );
    prisma.shift.count.mockResolvedValue(0);
    prisma.staffingRequest.count.mockResolvedValue(
      0,
    );

    await expect(
      service.predictStaffingPressure({
        cinemaId: 7,
        startTime: new Date(
          '2026-07-24T17:00:00.000Z',
        ),
        endTime: new Date(
          '2026-07-24T18:00:00.000Z',
        ),
      }),
    ).resolves.toMatchObject({
      level: 'MEDIUM',
      score: 55,
    });
  });

  it.each([
    '1e2',
    '1.5',
    0,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid cinema ID %p', async (cinemaId) => {
    await expect(
      service.predictStaffingPressure({
        cinemaId: cinemaId as number,
        startTime: new Date(
          '2026-07-21T08:00:00.000Z',
        ),
        endTime: new Date(
          '2026-07-21T16:00:00.000Z',
        ),
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      prisma.movieShowing.count,
    ).not.toHaveBeenCalled();
  });

  it('rejects a reversed range before querying', async () => {
    await expect(
      service.predictStaffingPressure({
        cinemaId: 7,
        startTime: new Date(
          '2026-07-21T16:00:00.000Z',
        ),
        endTime: new Date(
          '2026-07-21T08:00:00.000Z',
        ),
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      prisma.movieShowing.count,
    ).not.toHaveBeenCalled();
  });
});
