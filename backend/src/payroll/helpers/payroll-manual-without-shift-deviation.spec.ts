import {
  analyzePayrollTimeEntryDeviation,
} from './payroll-deviation';

describe('payroll manual entry without shift deviation semantics', () => {
  it('does not count a manual no-shift entry as a payroll deviation', () => {
    const deviation =
      analyzePayrollTimeEntryDeviation({
        clockIn: new Date('2026-08-22T21:00:00.000Z'),
        clockOut: new Date('2026-08-22T23:00:00.000Z'),
        shift: null,
        cinema: {
          requireNoteForManualEntry: true,
          timeEntryMinuteStep: 15,
        },
      });

    expect(deviation).toMatchObject({
      hasDeviation: false,
      requiresNote: true,
      types: ['MANUAL_WITHOUT_SHIFT'],
      plannedMinutes: null,
      registeredMinutes: 120,
      differenceMinutes: null,
    });
  });

  it('preserves a disabled manual note requirement in payroll data', () => {
    const deviation =
      analyzePayrollTimeEntryDeviation({
        clockIn: new Date('2026-08-22T12:00:00.000Z'),
        clockOut: new Date('2026-08-22T13:00:00.000Z'),
        shift: null,
        cinema: {
          requireNoteForManualEntry: false,
          timeEntryMinuteStep: 1,
        },
      });

    expect(deviation.hasDeviation).toBe(false);
    expect(deviation.requiresNote).toBe(false);
    expect(deviation.types).toEqual([
      'MANUAL_WITHOUT_SHIFT',
    ]);
  });
});
