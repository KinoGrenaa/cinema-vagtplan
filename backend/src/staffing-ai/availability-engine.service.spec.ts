import { BadRequestException } from '@nestjs/common';
import { AvailabilityEngineService } from './availability-engine.service';

describe('AvailabilityEngineService', () => {
  let prisma: {
    shift: {
      findFirst: jest.Mock;
    };
    leaveRequest: {
      findFirst: jest.Mock;
    };
  };
  let service: AvailabilityEngineService;

  const start = new Date('2026-07-21T08:00:00Z');
  const end = new Date('2026-07-21T16:00:00Z');

  beforeEach(() => {
    prisma = {
      shift: {
        findFirst: jest.fn(),
      },
      leaveRequest: {
        findFirst: jest.fn(),
      },
    };

    service = new AvailabilityEngineService(
      prisma as never,
    );
  });

  it.each([
    ['1e2', 7],
    [3, '1.5'],
    [0, 7],
    [3, Number.MAX_SAFE_INTEGER + 1],
  ])(
    'rejects invalid cinema/user IDs %p/%p',
    async (cinemaId, userId) => {
      await expect(
        service.getAvailabilityScore(
          cinemaId as number,
          userId as number,
          start,
          end,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(
        prisma.shift.findFirst,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid time range before querying', async () => {
    await expect(
      service.getAvailabilityScore(
        3,
        7,
        end,
        start,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      prisma.shift.findFirst,
    ).not.toHaveBeenCalled();
  });

  it('returns zero for a globally overlapping shift', async () => {
    prisma.shift.findFirst.mockResolvedValueOnce({
      id: 11,
    });

    await expect(
      service.getAvailabilityScore(
        3,
        7,
        start,
        end,
      ),
    ).resolves.toEqual({
      score: 0,
      reasoning: [
        'Brugeren har allerede en overlappende vagt',
      ],
    });

    expect(
      prisma.shift.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        userId: 7,
        startTime: {
          lt: end,
        },
        endTime: {
          gt: start,
        },
      },
      select: {
        id: true,
      },
    });
    expect(
      prisma.leaveRequest.findFirst,
    ).not.toHaveBeenCalled();
  });

  it('returns zero for approved leave in the cinema', async () => {
    prisma.shift.findFirst.mockResolvedValueOnce(null);
    prisma.leaveRequest.findFirst.mockResolvedValue({
      id: 12,
    });

    await expect(
      service.getAvailabilityScore(
        3,
        7,
        start,
        end,
      ),
    ).resolves.toEqual({
      score: 0,
      reasoning: [
        'Brugeren har godkendt fravær',
      ],
    });
  });

  it('reduces the score for short global rest time', async () => {
    prisma.shift.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        endTime: new Date(
          '2026-07-21T02:00:00Z',
        ),
      });
    prisma.leaveRequest.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      service.getAvailabilityScore(
        3,
        7,
        start,
        end,
      ),
    ).resolves.toEqual({
      score: 50,
      reasoning: [
        'Kun 6.0 timers hvile siden sidste vagt',
      ],
    });
  });

  it('returns full score when there are no blockers', async () => {
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.leaveRequest.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      service.getAvailabilityScore(
        3,
        7,
        start,
        end,
      ),
    ).resolves.toEqual({
      score: 100,
      reasoning: [],
    });
  });
});
