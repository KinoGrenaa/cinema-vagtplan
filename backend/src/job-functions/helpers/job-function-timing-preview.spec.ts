import { previewJobFunctionTiming } from './job-function-timing-preview';

const admin = {
  id: 2,
  email: 'admin@test.dk',
  role: 'ADMIN' as const,
  cinemaId: 1,
  canManageSchedule: true,
};

function createPrismaMock(
  fallbackStartMinute: number,
  fallbackEndMinute: number,
) {
  return {
    jobFunction: {
      findFirst: jest.fn().mockResolvedValue({
        id: 7,
        cinemaId: 1,
        name: 'A Vagt',
        color: '#2563eb',
        isActive: true,
        defaultPayrollExportCode: null,
        _count: {
          userJobFunctions: 0,
          shifts: 0,
        },
        timingRule: {
          isActive: true,
          filmWindowStartMinute: 16 * 60,
          filmWindowEndMinute: 23 * 60,
          startAnchor: 'FIRST_MOVIE_START',
          startOffsetMinutes: -60,
          startFixedMinute: null,
          endAnchor: 'LAST_MOVIE_END',
          endOffsetMinutes: 0,
          endFixedMinute: null,
          fallbackStartMinute,
          fallbackEndMinute,
          roundStartToNearestQuarter: false,
          roundEndToNearestQuarter: false,
          restrictMovieStartsToWindow: true,
        },
      }),
    },
    movieShowing: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('job-function timing preview', () => {
  it('returnerer konkrete ISO-tider i Europe/Copenhagen', async () => {
    const prisma = createPrismaMock(16 * 60, 20 * 60);

    const result = await previewJobFunctionTiming(
      prisma as never,
      admin,
      7,
      { date: '2026-08-15' },
    );

    expect(result.usedFallback).toBe(true);
    expect(result.startMinute).toBe(16 * 60);
    expect(result.endMinute).toBe(20 * 60);
    expect(result.startTime).toBe('2026-08-15T14:00:00.000Z');
    expect(result.endTime).toBe('2026-08-15T18:00:00.000Z');
  });

  it('returnerer korrekt slutdato for en vagt over midnat', async () => {
    const prisma = createPrismaMock(22 * 60, 60);

    const result = await previewJobFunctionTiming(
      prisma as never,
      admin,
      7,
      { date: '2026-08-15' },
    );

    expect(result.startMinute).toBe(22 * 60);
    expect(result.endMinute).toBe(25 * 60);
    expect(result.startTime).toBe('2026-08-15T20:00:00.000Z');
    expect(result.endTime).toBe('2026-08-15T23:00:00.000Z');
  });
});
