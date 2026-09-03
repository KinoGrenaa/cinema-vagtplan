import {
  analyzeTimeEntryDeviation,
  getCinemaDeviationSelect,
} from './time-entry-deviation';
import {
  resolveTimeEntryMinuteStep,
  roundDateToTimeEntryMinuteStep,
} from './time-entry-planned-rounding';

describe('time entry planned rounding', () => {
  it.each([
    [undefined, 1],
    [null, 1],
    [1, 1],
    [5, 5],
    [15, 15],
    [10, 1],
  ])(
    'normalizes minute step %p to %i',
    (
      input,
      expected,
    ) => {
      expect(
        resolveTimeEntryMinuteStep(
          input,
        ),
      ).toBe(
        expected,
      );
    },
  );

  it('rounds planned timestamps including a date rollover', () => {
    expect(
      roundDateToTimeEntryMinuteStep(
        new Date(
          '2026-09-03T20:05:00.000Z',
        ),
        15,
      ).toISOString(),
    ).toBe(
      '2026-09-03T20:00:00.000Z',
    );

    expect(
      roundDateToTimeEntryMinuteStep(
        new Date(
          '2026-09-03T21:55:00.000Z',
        ),
        15,
      ).toISOString(),
    ).toBe(
      '2026-09-03T22:00:00.000Z',
    );
  });

  it('treats Test 4 planned 16:00-21:35 as 16:00-21:30 at 15 minute precision', () => {
    const deviation =
      analyzeTimeEntryDeviation(
        {
          clockIn:
            new Date(
              '2026-09-03T14:00:00.000Z',
            ),
          clockOut:
            new Date(
              '2026-09-03T19:30:00.000Z',
            ),
          shift: {
            startTime:
              new Date(
                '2026-09-03T14:00:00.000Z',
              ),
            endTime:
              new Date(
                '2026-09-03T19:35:00.000Z',
              ),
          },
          cinema: {
            clockInDeviationToleranceMinutes:
              0,
            clockOutDeviationToleranceMinutes:
              0,
            requireNoteForClockInDeviation:
              true,
            requireNoteForClockOutDeviation:
              true,
            requireNoteForManualEntry:
              true,
            timeEntryMinuteStep:
              15,
          },
        },
      );

    expect(
      deviation,
    ).toMatchObject({
      hasDeviation: false,
      requiresNote: false,
      types: ['NONE'],
      plannedMinutes: 330,
      registeredMinutes: 330,
      differenceMinutes: 0,
      clockInDeviationMinutes: 0,
      clockOutDeviationMinutes: 0,
    });
  });

  it('keeps the raw planned comparison at one minute precision', () => {
    const deviation =
      analyzeTimeEntryDeviation(
        {
          clockIn:
            new Date(
              '2026-09-03T14:00:00.000Z',
            ),
          clockOut:
            new Date(
              '2026-09-03T19:30:00.000Z',
            ),
          shift: {
            startTime:
              new Date(
                '2026-09-03T14:00:00.000Z',
              ),
            endTime:
              new Date(
                '2026-09-03T19:35:00.000Z',
              ),
          },
          cinema: {
            clockInDeviationToleranceMinutes:
              0,
            clockOutDeviationToleranceMinutes:
              0,
            requireNoteForClockInDeviation:
              true,
            requireNoteForClockOutDeviation:
              true,
            timeEntryMinuteStep:
              1,
          },
        },
      );

    expect(
      deviation.hasDeviation,
    ).toBe(true);
    expect(
      deviation.requiresNote,
    ).toBe(true);
    expect(
      deviation.plannedMinutes,
    ).toBe(335);
    expect(
      deviation.clockOutDeviationMinutes,
    ).toBe(-5);
  });

  it('selects the cinema minute step wherever deviation settings are loaded', () => {
    expect(
      getCinemaDeviationSelect(),
    ).toMatchObject({
      timeEntryMinuteStep:
        true,
    });
  });
});
