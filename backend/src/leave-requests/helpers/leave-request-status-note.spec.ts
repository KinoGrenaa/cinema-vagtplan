import {
  BadRequestException,
} from '@nestjs/common';

import {
  MAX_LEAVE_STATUS_NOTE_LENGTH,
  normalizeLeaveStatusNote,
} from './leave-request-status-note';

describe('leave request admin status note', () => {
  it('requires a note when admin rejects', () => {
    expect(() =>
      normalizeLeaveStatusNote({
        isAdmin: true,
        status: 'REJECTED',
        note: '   ',
      }),
    ).toThrow(
      BadRequestException,
    );
  });

  it('requires a note when admin cancels', () => {
    expect(() =>
      normalizeLeaveStatusNote({
        isAdmin: true,
        status: 'CANCELLED',
      }),
    ).toThrow(
      BadRequestException,
    );
  });

  it('trims and returns an admin note', () => {
    expect(
      normalizeLeaveStatusNote({
        isAdmin: true,
        status: 'REJECTED',
        note: '  Ikke muligt denne dag  ',
      }),
    ).toBe(
      'Ikke muligt denne dag',
    );
  });

  it('does not require an extra note for employee self-cancellation', () => {
    expect(
      normalizeLeaveStatusNote({
        isAdmin: false,
        status: 'CANCELLED',
      }),
    ).toBeNull();
  });

  it('rejects notes longer than the maximum', () => {
    expect(() =>
      normalizeLeaveStatusNote({
        isAdmin: true,
        status: 'REJECTED',
        note: 'x'.repeat(
          MAX_LEAVE_STATUS_NOTE_LENGTH +
            1,
        ),
      }),
    ).toThrow(
      BadRequestException,
    );
  });
});
