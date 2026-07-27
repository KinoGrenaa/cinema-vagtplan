import {
  ensureNoOverlappingShift,
} from './leave-request-processing-helpers';

describe('leave overlap shift read shape', () => {
  it('henter kun tider og jobfunktionsnavn', async () => {
    const prisma = {
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      leaveRequest: {
        findFirst: jest.fn(),
      },
    };
    const startDate =
      new Date('2026-08-10T08:00:00.000Z');
    const endDate =
      new Date('2026-08-10T16:00:00.000Z');

    await ensureNoOverlappingShift({
      prisma: prisma as never,
      userId: 9,
      cinemaId: 7,
      startDate,
      endDate,
    });

    expect(
      prisma.shift.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        userId: 9,
        cinemaId: 7,
        startTime: {
          lt: endDate,
        },
        endTime: {
          gt: startDate,
        },
      },
      select: {
        startTime: true,
        endTime: true,
        workType: {
          select: {
            name: true,
          },
        },
      },
    });
  });
});
