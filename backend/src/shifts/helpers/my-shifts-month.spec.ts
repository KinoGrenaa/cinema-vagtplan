import { BadRequestException } from '@nestjs/common';
import {
  findMyShiftsForMonth,
  getCopenhagenMonthRange,
  myShiftSelect,
} from './my-shifts-month';

describe('my shifts month read', () => {
  it('bygger en København-måned med korrekt DST-længde', () => {
    const march = getCopenhagenMonthRange('2026-03');
    const october = getCopenhagenMonthRange('2026-10');

    expect(
      march.end.getTime() - march.start.getTime(),
    ).toBe(743 * 60 * 60 * 1000);
    expect(
      october.end.getTime() - october.start.getTime(),
    ).toBe(745 * 60 * 60 * 1000);
  });

  it.each([
    undefined,
    '',
    '2026-1',
    '2026-00',
    '2026-13',
    'ikke-en-måned',
  ])('afviser ugyldig måned %p', (month) => {
    expect(() =>
      getCopenhagenMonthRange(month),
    ).toThrow(BadRequestException);
  });

  it('henter kun brugerens måned og et beskyttet deep-link-mål', async () => {
    const items = [
      {
        id: 10,
      },
    ];
    const target = {
      id: 81,
    };
    const prisma = {
      shift: {
        findMany: jest.fn().mockResolvedValue(items),
        findFirst: jest.fn().mockResolvedValue(target),
      },
    };

    const result = await findMyShiftsForMonth(
      prisma as never,
      {
        userId: 9,
        cinemaId: 7,
        month: '2026-08',
        targetId: 81,
      },
    );

    const range = getCopenhagenMonthRange('2026-08');

    expect(prisma.shift.findMany).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        userId: 9,
        AND: [
          {
            startTime: {
              lt: range.end,
            },
          },
          {
            endTime: {
              gt: range.start,
            },
          },
        ],
      },
      select: myShiftSelect,
      orderBy: [
        {
          startTime: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
    expect(prisma.shift.findFirst).toHaveBeenCalledWith({
      where: {
        id: 81,
        cinemaId: 7,
        userId: 9,
      },
      select: myShiftSelect,
    });
    expect(result).toEqual({
      month: '2026-08',
      items,
      target,
    });
  });
});
