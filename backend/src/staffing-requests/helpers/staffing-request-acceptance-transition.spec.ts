import {
  StaffingRequestStatus,
} from '@prisma/client';

import {
  buildStaffingRequestAcceptedData,
} from './staffing-request-acceptance-transition';

describe('staffing request acceptance transition', () => {
  it('stores both acceptance time and accepting employee', () => {
    const acceptedAt =
      new Date(
        '2026-09-13T09:05:00.000Z',
      );

    expect(
      buildStaffingRequestAcceptedData(
        9,
        acceptedAt,
      ),
    ).toEqual({
      status:
        StaffingRequestStatus.ACCEPTED,
      acceptedAt,
      acceptedByUserId: 9,
    });
  });
});
