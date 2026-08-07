import { resolveJobFunctionTiming } from '../job-functions/helpers/job-function-timing-resolver';
import { buildShiftPlanningMonthWorkingPreview } from './shift-planning-month-working-preview';

jest.mock('../job-functions/helpers/job-function-timing-resolver', () => ({
  resolveJobFunctionTiming: jest.fn(),
}));

const mockedResolveJobFunctionTiming = jest.mocked(resolveJobFunctionTiming);

describe('buildShiftPlanningMonthWorkingPreview', () => {
  beforeEach(() => {
    mockedResolveJobFunctionTiming.mockReset();
    mockedResolveJobFunctionTiming.mockReturnValue({
      startMinute: 16 * 60,
      endMinute: 21 * 60 + 35,
      explanation: { source: 'test' },
      sourceMovieShowingIds: [],
    } as any);
  });

  it('beregner uden at gemme og markerer kun den eksisterende dublet', async () => {
    const monthPlanDay = {
      id: 11,
      date: new Date('2026-08-10T00:00:00.000Z'),
      scheduleTemplate: {
        id: 20,
        name: 'Lige uger',
        weekParity: 'EVEN',
        isActive: true,
        archivedAt: null,
        days: [
          {
            id: 21,
            weekday: 1,
            isActive: true,
            jobFunctions: [
              {
                id: 31,
                jobFunctionId: 41,
                requiredCount: 2,
                jobFunction: {
                  id: 41,
                  name: 'A Vagt Hverdag',
                  color: '#2563eb',
                  isActive: true,
                  archivedAt: null,
                  timingRule: { startAnchor: 'FIXED', endAnchor: 'FIXED' },
                },
                assignments: [],
              },
            ],
          },
        ],
      },
    };
    const prisma = {
      monthPlanDay: { findMany: jest.fn().mockResolvedValue([monthPlanDay]) },
      movieShowing: { findMany: jest.fn().mockResolvedValue([]) },
      shift: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 91,
            jobFunctionId: 41,
            userId: null,
            startTime: new Date('2026-08-10T14:00:00.000Z'),
            endTime: new Date('2026-08-10T19:35:00.000Z'),
          },
        ]),
      },
    } as any;

    const result = await buildShiftPlanningMonthWorkingPreview(
      prisma,
      1,
      2026,
      8,
      new Date('2026-08-06T08:00:00.000Z'),
    );

    expect(result.persistsDraft).toBe(false);
    expect(result.summary).toMatchObject({
      itemCount: 2,
      readyItemCount: 1,
      blockedItemCount: 1,
      existingShiftCount: 1,
    });
    expect(result.items.filter((item) => item.canBecomeShift)).toHaveLength(1);
    expect(prisma.monthPlanDay.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.shift.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toBeUndefined();
  });

  it('returnerer en tom arbejdsplan uden skrivekald', async () => {
    const prisma = {
      monthPlanDay: { findMany: jest.fn().mockResolvedValue([]) },
      movieShowing: { findMany: jest.fn().mockResolvedValue([]) },
      shift: { findMany: jest.fn() },
    } as any;

    const result = await buildShiftPlanningMonthWorkingPreview(
      prisma,
      1,
      2026,
      8,
      new Date('2026-08-06T08:00:00.000Z'),
    );

    expect(result.summary.itemCount).toBe(0);
    expect(result.items).toEqual([]);
    expect(prisma.shift.findMany).not.toHaveBeenCalled();
  });
});
