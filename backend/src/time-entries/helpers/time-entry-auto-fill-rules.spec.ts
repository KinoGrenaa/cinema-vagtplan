import {
  resolveAutomaticClockOut,
} from './time-entry-auto-fill-rules';

describe('automatic time registration rules', () => {
  it('uses planned end for planned-shift method', () => {
    const result =
      resolveAutomaticClockOut({
        method:
          'PLANNED_SHIFT',
        fixedMinutes: 0,
        clockIn:
          new Date(
            '2026-08-16T15:37:00.000Z',
          ),
        plannedClockOut:
          new Date(
            '2026-08-16T18:00:00.000Z',
          ),
      });

    expect(
      result.toISOString(),
    ).toBe(
      '2026-08-16T18:00:00.000Z',
    );
  });

  it('counts fixed minutes from actual clock-in', () => {
    const result =
      resolveAutomaticClockOut({
        method:
          'FIXED_MINUTES',
        fixedMinutes: 240,
        clockIn:
          new Date(
            '2026-08-16T15:37:00.000Z',
          ),
        plannedClockOut:
          new Date(
            '2026-08-16T18:00:00.000Z',
          ),
      });

    expect(
      result.toISOString(),
    ).toBe(
      '2026-08-16T19:37:00.000Z',
    );
  });

  it('rejects zero fixed minutes', () => {
    expect(() =>
      resolveAutomaticClockOut({
        method:
          'FIXED_MINUTES',
        fixedMinutes: 0,
        clockIn:
          new Date(
            '2026-08-16T15:00:00.000Z',
          ),
        plannedClockOut:
          new Date(
            '2026-08-16T18:00:00.000Z',
          ),
      }),
    ).toThrow();
  });

  it('rejects planned end before actual clock-in', () => {
    expect(() =>
      resolveAutomaticClockOut({
        method:
          'PLANNED_SHIFT',
        fixedMinutes: 0,
        clockIn:
          new Date(
            '2026-08-16T19:00:00.000Z',
          ),
        plannedClockOut:
          new Date(
            '2026-08-16T18:00:00.000Z',
          ),
      }),
    ).toThrow();
  });
});
