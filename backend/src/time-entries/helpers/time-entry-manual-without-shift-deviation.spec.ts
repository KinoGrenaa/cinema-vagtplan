import {
  analyzeTimeEntryDeviation,
} from './time-entry-deviation';

describe('manual time entry without shift deviation semantics', () => {
  const entry = {
    clockIn: new Date('2026-08-22T21:00:00.000Z'),
    clockOut: new Date('2026-08-22T23:00:00.000Z'),
    shift: null,
  };

  it('treats manual work without a shift as a type, not a deviation', () => {
    const deviation =
      analyzeTimeEntryDeviation(
        entry,
        {
          requireNoteForManualEntry: true,
        },
      );

    expect(deviation).toMatchObject({
      hasDeviation: false,
      requiresNote: true,
      types: ['MANUAL_WITHOUT_SHIFT'],
      plannedMinutes: null,
      registeredMinutes: 120,
      differenceMinutes: null,
      clockInDeviationMinutes: null,
      clockOutDeviationMinutes: null,
    });
    expect(deviation.messages).toEqual([
      'Tidsregistreringen er ikke tilknyttet en planlagt vagt',
    ]);
  });

  it('keeps the cinema note setting independent of deviation status', () => {
    const deviation =
      analyzeTimeEntryDeviation(
        entry,
        {
          requireNoteForManualEntry: false,
        },
      );

    expect(deviation.hasDeviation).toBe(false);
    expect(deviation.requiresNote).toBe(false);
    expect(deviation.types).toEqual([
      'MANUAL_WITHOUT_SHIFT',
    ]);
  });
});
