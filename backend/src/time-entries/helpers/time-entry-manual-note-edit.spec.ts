import { BadRequestException } from '@nestjs/common';

import { getOwnTimeEntryUpdateContext } from './time-entry-update-helpers';

describe('manual time entry note editing', () => {
  const clockIn =
    new Date('2026-08-22T20:00:00.000Z');
  const clockOut =
    new Date('2026-08-22T21:00:00.000Z');

  function createManualEntry(
    requireNoteForManualEntry = true,
  ) {
    return {
      id: 44,
      userId: 12,
      cinemaId: 3,
      status: 'PENDING',
      clockIn,
      clockOut,
      note: 'Oprindelig begrundelse',
      clockInNote:
        'Oprindelig begrundelse',
      clockOutNote:
        'Oprindelig begrundelse',
      adminNote: null,
      shift: null,
      cinema: {
        requireNoteForManualEntry,
      },
    };
  }

  it('updates the general note without rewriting legacy clock-specific notes', () => {
    const context =
      getOwnTimeEntryUpdateContext(
        createManualEntry(),
        {
          clockIn:
            clockIn.toISOString(),
          clockOut:
            clockOut.toISOString(),
          note:
            'Ny samlet begrundelse',
        },
      );

    expect(context.newNote).toBe(
      'Ny samlet begrundelse',
    );
    expect(
      context.newClockInNote,
    ).toBe(
      'Oprindelig begrundelse',
    );
    expect(
      context.newClockOutNote,
    ).toBe(
      'Oprindelig begrundelse',
    );
    expect(context.changes).toEqual([
      'Note / begrundelse ændret',
    ]);
  });

  it('requires a general note when the cinema setting is enabled', () => {
    expect(() =>
      getOwnTimeEntryUpdateContext(
        createManualEntry(true),
        {
          clockIn:
            clockIn.toISOString(),
          clockOut:
            clockOut.toISOString(),
          note: '   ',
          clockInNote: null,
          clockOutNote: null,
        },
      ),
    ).toThrow(BadRequestException);
  });

  it('allows an empty general note when the cinema setting is disabled', () => {
    const entry = {
      ...createManualEntry(false),
      note: null,
      clockInNote: null,
      clockOutNote: null,
    };

    const context =
      getOwnTimeEntryUpdateContext(
        entry,
        {
          clockIn:
            new Date(
              clockIn.getTime() +
                15 * 60 * 1000,
            ).toISOString(),
          clockOut:
            clockOut.toISOString(),
          note: null,
        },
      );

    expect(context.newNote).toBeNull();
    expect(
      context.changes.some(
        (change) =>
          change.startsWith(
            'Mødetid: ',
          ),
      ),
    ).toBe(true);
  });
});
