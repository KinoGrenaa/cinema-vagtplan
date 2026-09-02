import {
  findScheduleShiftsForRange,
  getScheduleShiftRange,
} from './schedule-shift-range-read';
import {
  scheduleShiftSelect,
} from './schedule-shift-read';

describe('schedule shift range read', () => {
  it('henter 10 kalenderdage med København-grænser', async () => {
    const prisma = {
      shift: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
      },
    };
    const range =
      getScheduleShiftRange(
        '2026-08-31',
        '2026-09-09',
      );

    expect(range.days).toBe(10);

    await findScheduleShiftsForRange(
      prisma as never,
      7,
      '2026-08-31',
      '2026-09-09',
    );

    expect(
      prisma.shift.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        startTime: {
          gte: range.start,
          lt: range.end,
        },
      },
      select:
        scheduleShiftSelect,
      orderBy: [
        {
          startTime: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  });

  it('bevarer lokale døgn over vintertidsskift', () => {
    const range =
      getScheduleShiftRange(
        '2026-10-20',
        '2026-10-29',
      );

    expect(range.days).toBe(10);
    expect(
      range.end.getTime() -
        range.start.getTime(),
    ).toBe(
      241 * 60 * 60 * 1000,
    );
  });

  it('afviser omvendte og for lange perioder', () => {
    expect(() =>
      getScheduleShiftRange(
        '2026-09-10',
        '2026-09-09',
      ),
    ).toThrow();

    expect(() =>
      getScheduleShiftRange(
        '2026-08-01',
        '2026-08-31',
      ),
    ).toThrow();
  });
});
