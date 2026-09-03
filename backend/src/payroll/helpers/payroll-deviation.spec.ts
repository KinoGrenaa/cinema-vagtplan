import {
  analyzePayrollTimeEntryDeviation,
} from './payroll-deviation';

describe('payroll deviation planned rounding', () => {
  it('uses the cinema minute step for the same Test 4 comparison basis', () => {
    const deviation =
      analyzePayrollTimeEntryDeviation(
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
            timeEntryMinuteStep:
              15,
          },
        },
        0,
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

  it('preserves raw planned minutes when the cinema uses one minute precision', () => {
    const deviation =
      analyzePayrollTimeEntryDeviation(
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
            timeEntryMinuteStep:
              1,
          },
        },
        0,
      );

    expect(
      deviation.hasDeviation,
    ).toBe(true);
    expect(
      deviation.plannedMinutes,
    ).toBe(335);
    expect(
      deviation.clockOutDeviationMinutes,
    ).toBe(-5);
  });
});
