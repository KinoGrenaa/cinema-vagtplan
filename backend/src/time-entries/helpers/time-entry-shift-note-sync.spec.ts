import {
  getOwnTimeEntryUpdateContext,
} from './time-entry-update-helpers';

describe('planned shift note synchronization on employee edit', () => {
  const clockIn =
    new Date('2026-09-03T16:15:00.000Z');
  const clockOut =
    new Date('2026-09-03T20:00:00.000Z');

  function createShiftEntry(overrides: Record<string, unknown> = {}) {
    return {
      id: 28,
      userId: 3,
      cinemaId: 1,
      status: 'NEEDS_CHANGES',
      clockIn,
      clockOut,
      note:
        'Fyraften: Test 15 minutter efter planlagt fyraften',
      clockInNote: null,
      clockOutNote:
        'Test 15 minutter efter planlagt fyraften',
      adminNote: 'Ret fyraften til 22:00',
      shift: {
        startTime: clockIn,
        endTime: clockOut,
      },
      cinema: {
        clockInDeviationToleranceMinutes: 0,
        clockOutDeviationToleranceMinutes: 0,
        requireNoteForClockInDeviation: true,
        requireNoteForClockOutDeviation: true,
        requireNoteForManualEntry: true,
        timeEntryMinuteStep: 15,
      },
      ...overrides,
    };
  }

  it('clears the derived general note when the employee clears the clock notes', () => {
    const context =
      getOwnTimeEntryUpdateContext(
        createShiftEntry(),
        {
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          clockInNote: '',
          clockOutNote: '',
        },
      );

    expect(context.newClockInNote).toBeNull();
    expect(context.newClockOutNote).toBeNull();
    expect(context.newNote).toBeNull();
    expect(context.changes).toContain(
      'Note / begrundelse ændret',
    );
    expect(context.changes).toContain(
      'Fyraftensnote ændret',
    );
  });

  it('rebuilds a derived general note from the notes that remain', () => {
    const context =
      getOwnTimeEntryUpdateContext(
        createShiftEntry({
          note:
            'Mødetidsforklaring\n\nFyraften: Fyraftensforklaring',
          clockInNote: 'Mødetidsforklaring',
          clockOutNote: 'Fyraftensforklaring',
        }),
        {
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          clockInNote: 'Mødetidsforklaring',
          clockOutNote: '',
        },
      );

    expect(context.newNote).toBe(
      'Mødetidsforklaring',
    );
    expect(context.newClockInNote).toBe(
      'Mødetidsforklaring',
    );
    expect(context.newClockOutNote).toBeNull();
  });

  it('normalizes a stale general note on a shift-linked entry from the current clock notes', () => {
    const context =
      getOwnTimeEntryUpdateContext(
        createShiftEntry({
          note:
            'Fyraften: Test 15 minutter efter planlagt fyraften',
          clockInNote: null,
          clockOutNote: null,
        }),
        {
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          clockInNote: '',
          clockOutNote: '',
        },
      );

    expect(context.newNote).toBeNull();
    expect(context.newClockInNote).toBeNull();
    expect(context.newClockOutNote).toBeNull();
    expect(context.changes).toContain(
      'Note / begrundelse ændret',
    );
  });

  it('respects an explicitly supplied general note', () => {
    const context =
      getOwnTimeEntryUpdateContext(
        createShiftEntry(),
        {
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          note: 'Ny eksplicit note',
          clockInNote: '',
          clockOutNote: '',
        },
      );

    expect(context.newNote).toBe(
      'Ny eksplicit note',
    );
  });
});
