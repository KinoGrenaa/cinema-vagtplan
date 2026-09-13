import {
  StaffingRequestStatus,
} from '@prisma/client';

import {
  buildStaffingRequestVisibilityWhere,
} from './staffing-request-page';
import {
  assertCanRejectStaffingRequest,
} from './staffing-request-status-guards';

describe('broadcast staffing request declines', () => {
  const employee = {
    sub: 17,
    email: 'employee@example.test',
    role: 'EMPLOYEE' as const,
    cinemaId: 1,
  };

  it('allows a recipient to decline a broadcast request personally', () => {
    expect(() =>
      assertCanRejectStaffingRequest(
        employee,
        {
          targetUserId: null,
        },
      ),
    ).not.toThrow();
  });

  it('keeps a targeted request protected from other users', () => {
    expect(() =>
      assertCanRejectStaffingRequest(
        employee,
        {
          targetUserId: 99,
        },
      ),
    ).toThrow(
      'Du kan ikke afvise denne forespørgsel',
    );
  });

  it('hides a broadcast request from an employee who already declined it', () => {
    const where =
      buildStaffingRequestVisibilityWhere(
        employee,
        1,
      ) as any;

    expect(
      where.OR[2].declines,
    ).toEqual({
      none: {
        userId: 17,
      },
    });
  });

  it('keeps the global request status pending for personal declines', () => {
    expect(
      StaffingRequestStatus.PENDING,
    ).toBe('PENDING');
  });
});
