import {
  readFileSync,
} from 'node:fs';

import {
  ensureApprovalDeviationNotes,
} from './time-entry-deviation-notes';

describe(
  'approval with admin note',
  () => {
    const deviation = {
      requiresNote: true,
      types: [],
    } as any;

    it(
      'allows approval when only an admin note exists',
      () => {
        expect(() =>
          ensureApprovalDeviationNotes({
            deviation,
            clockInNote: null,
            clockOutNote: null,
            note: null,
            adminNote:
              'Admin accepterer afvigelsen',
          }),
        ).not.toThrow();
      },
    );

    it(
      'still rejects when neither employee nor admin supplied a note',
      () => {
        expect(() =>
          ensureApprovalDeviationNotes({
            deviation,
            clockInNote: null,
            clockOutNote: null,
            note: null,
            adminNote: null,
          }),
        ).toThrow(
          'Tidsregistreringen har afvigelser og kræver en medarbejder- eller admin-note før godkendelse',
        );
      },
    );

    it(
      'approval helper forwards stored adminNote',
      () => {
        const source =
          readFileSync(
            require.resolve(
              './time-entry-approval-helpers',
            ),
            'utf8',
          );

        expect(source).toContain(
          'adminNote: existingEntry.adminNote',
        );
      },
    );
  },
);
