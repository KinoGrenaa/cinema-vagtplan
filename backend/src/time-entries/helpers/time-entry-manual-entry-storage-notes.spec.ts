import {
  analyzeTimeEntryDeviation,
} from './time-entry-deviation';
import {
  ensureManualEntryDeviationNotes,
} from './time-entry-deviation-notes';
import {
  getManualEntryStorageNotes,
} from './time-entry-note-helpers';

describe('manual entry storage note semantics', () => {
  const clockIn =
    new Date('2026-08-22T20:00:00.000Z');
  const clockOut =
    new Date('2026-08-22T21:00:00.000Z');

  it('stores no-shift manual entry as one general note only', () => {
    expect(
      getManualEntryStorageNotes(
        {
          note:
            '  Arbejde uden vagt  ',
        },
        false,
      ),
    ).toEqual({
      note: 'Arbejde uden vagt',
      clockInNote: null,
      clockOutNote: null,
    });
  });

  it('keeps an empty no-shift note optional at storage level', () => {
    expect(
      getManualEntryStorageNotes(
        {
          note: '   ',
        },
        false,
      ),
    ).toEqual({
      note: null,
      clockInNote: null,
      clockOutNote: null,
    });
  });

  it('requires no-shift note when the cinema setting is enabled', () => {
    const deviation =
      analyzeTimeEntryDeviation(
        {
          clockIn,
          clockOut,
          shift: null,
          cinema: {
            requireNoteForManualEntry:
              true,
          },
        },
      );

    expect(() =>
      ensureManualEntryDeviationNotes({
        deviation,
        note: null,
        clockInNote: null,
        clockOutNote: null,
      }),
    ).toThrow(
      'Du skal skrive en note ved manuel registrering uden vagt',
    );
  });

  it('allows no-shift entry without note when the cinema setting is disabled', () => {
    const deviation =
      analyzeTimeEntryDeviation(
        {
          clockIn,
          clockOut,
          shift: null,
          cinema: {
            requireNoteForManualEntry:
              false,
          },
        },
      );

    expect(() =>
      ensureManualEntryDeviationNotes({
        deviation,
        note: null,
        clockInNote: null,
        clockOutNote: null,
      }),
    ).not.toThrow();
  });

  it('keeps note fallback for a shift-linked manual entry', () => {
    expect(
      getManualEntryStorageNotes(
        {
          note:
            'Afvigelse fra vagt',
        },
        true,
      ),
    ).toEqual({
      note:
        'Afvigelse fra vagt',
      clockInNote:
        'Afvigelse fra vagt',
      clockOutNote:
        'Afvigelse fra vagt',
    });
  });
});
