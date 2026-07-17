import { BadRequestException } from '@nestjs/common';
import { ensureTimeEntryCanBeSentBack } from './time-entry-reject-status';

describe('ensureTimeEntryCanBeSentBack', () => {
  it.each(['PENDING', 'NEEDS_CHANGES'])(
    'tillader status %s',
    (status) => {
      expect(() =>
        ensureTimeEntryCanBeSentBack({
          status,
        }),
      ).not.toThrow();
    },
  );

  it('kræver fjernelse af godkendelse før send retur', () => {
    expect(() =>
      ensureTimeEntryCanBeSentBack({
        status: 'APPROVED',
      }),
    ).toThrow(
      new BadRequestException(
        'Fjern godkendelsen, før tidsregistreringen sendes retur til rettelse.',
      ),
    );
  });

  it('afviser annullerede registreringer', () => {
    expect(() =>
      ensureTimeEntryCanBeSentBack({
        status: 'VOIDED',
      }),
    ).toThrow(
      new BadRequestException(
        'En annulleret tidsregistrering kan ikke sendes retur til rettelse.',
      ),
    );
  });
});
