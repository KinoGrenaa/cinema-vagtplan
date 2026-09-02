import { resolveOwnTimeEntryAdminNote } from './time-entry-own-admin-note';

describe('resolveOwnTimeEntryAdminNote', () => {
  it('rydder returbeskeden når medarbejderen retter en registrering der kræver handling', () => {
    expect(
      resolveOwnTimeEntryAdminNote({
        status: 'NEEDS_CHANGES',
        adminNote: 'Ret venligst fyraften',
      }),
    ).toBeNull();
  });

  it('bevarer en adminnote ved almindelig medarbejderredigering der ikke kommer fra kræver handling', () => {
    expect(
      resolveOwnTimeEntryAdminNote({
        status: 'PENDING',
        adminNote: 'Administrativ oplysning',
      }),
    ).toBe('Administrativ oplysning');
  });
});
