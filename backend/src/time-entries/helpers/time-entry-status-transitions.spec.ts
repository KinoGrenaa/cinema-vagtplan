import { BadRequestException } from '@nestjs/common';
import { analyzeTimeEntryDeviation } from './time-entry-deviation';
import { ensureApprovalDeviationNotes } from './time-entry-deviation-notes';
import { ensureTimeEntryCanBeApproved } from './time-entry-approval-helpers';
import { ensureTimeEntryCanBeUnapproved } from './time-entry-status-action-helpers';

jest.mock('./time-entry-deviation', () => ({
  analyzeTimeEntryDeviation: jest.fn(),
}));

jest.mock('./time-entry-deviation-notes', () => ({
  ensureApprovalDeviationNotes: jest.fn(),
}));

describe('time entry status transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      analyzeTimeEntryDeviation as jest.Mock
    ).mockReturnValue({
      types: [],
    });
  });

  it('afviser gentaget godkendelse', () => {
    expect(() =>
      ensureTimeEntryCanBeApproved({
        status: 'APPROVED',
      }),
    ).toThrow(
      new BadRequestException(
        'Tidsregistreringen er allerede godkendt',
      ),
    );

    expect(
      analyzeTimeEntryDeviation,
    ).not.toHaveBeenCalled();
  });

  it('afviser godkendelse af en annulleret registrering', () => {
    expect(() =>
      ensureTimeEntryCanBeApproved({
        status: 'VOIDED',
      }),
    ).toThrow(
      new BadRequestException(
        'En annulleret tidsregistrering kan ikke godkendes',
      ),
    );
  });

  it.each(['PENDING', 'NEEDS_CHANGES'])(
    'bevarer godkendelse fra status %s',
    (status) => {
      const entry = {
        status,
        cinema: {},
        clockInNote: null,
        clockOutNote: null,
        note: null,
      };

      expect(() =>
        ensureTimeEntryCanBeApproved(entry),
      ).not.toThrow();

      expect(
        ensureApprovalDeviationNotes,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it('tillader kun fjernelse af godkendelse fra APPROVED', () => {
    expect(() =>
      ensureTimeEntryCanBeUnapproved({
        status: 'APPROVED',
      }),
    ).not.toThrow();

    expect(() =>
      ensureTimeEntryCanBeUnapproved({
        status: 'PENDING',
      }),
    ).toThrow(
      new BadRequestException(
        'Kun en godkendt tidsregistrering kan få fjernet godkendelsen',
      ),
    );

    expect(() =>
      ensureTimeEntryCanBeUnapproved({
        status: 'NEEDS_CHANGES',
      }),
    ).toThrow(
      new BadRequestException(
        'Kun en godkendt tidsregistrering kan få fjernet godkendelsen',
      ),
    );
  });

  it('bevarer særskilt fejl for annullerede registreringer', () => {
    expect(() =>
      ensureTimeEntryCanBeUnapproved({
        status: 'VOIDED',
      }),
    ).toThrow(
      new BadRequestException(
        'En annulleret tidsregistrering kan ikke genåbnes',
      ),
    );
  });
});
