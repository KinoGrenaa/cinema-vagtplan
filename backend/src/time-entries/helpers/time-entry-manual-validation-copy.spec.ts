import {
  analyzeTimeEntryDeviation,
} from './time-entry-deviation';
import {
  ensureApprovalDeviationNotes,
  ensureOwnTimeEntryDeviationNotes,
} from './time-entry-deviation-notes';

describe('manual time entry validation copy', () => {
  const deviation =
    analyzeTimeEntryDeviation(
      {
        clockIn:
          new Date(
            '2026-08-22T11:00:00.000Z',
          ),
        clockOut:
          new Date(
            '2026-08-22T12:00:00.000Z',
          ),
        shift: null,
      },
      {
        requireNoteForManualEntry: true,
      },
    );

  it('uses manual-entry wording when an employee edits without the required note', () => {
    expect(() =>
      ensureOwnTimeEntryDeviationNotes({
        deviation,
        note: null,
        clockInNote: null,
        clockOutNote: null,
      }),
    ).toThrow(
      'Du skal skrive en note ved manuel registrering uden vagt',
    );
  });

  it('uses manual-entry wording when approval is blocked by a missing note', () => {
    expect(() =>
      ensureApprovalDeviationNotes({
        deviation,
        note: null,
        clockInNote: null,
        clockOutNote: null,
      }),
    ).toThrow(
      'Den manuelle tidsregistrering kræver en medarbejder-note før godkendelse',
    );
  });
});
