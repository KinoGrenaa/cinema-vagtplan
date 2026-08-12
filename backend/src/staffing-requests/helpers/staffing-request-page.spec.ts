import {
  StaffingRequestStatus,
  StaffingRequestType,
} from '@prisma/client';

import {
  buildCompletedStaffingRequestPage,
  buildCompletedStaffingRequestWhere,
  buildPendingStaffingRequestWhere,
  buildStaffingRequestTargetWhere,
  buildStaffingRequestVisibilityWhere,
  MAX_STAFFING_REQUEST_PAGE_SIZE,
  normalizeStaffingRequestPageLimit,
} from './staffing-request-page';

describe(
  'staffing request pagination',
  () => {
    const employee = {
      sub: 9,
      email:
        'employee@example.com',
      role: 'EMPLOYEE' as const,
      cinemaId: 7,
    };
    const admin = {
      sub: 2,
      email:
        'admin@example.com',
      role: 'ADMIN' as const,
      cinemaId: 7,
    };

    it('begrænser sidestørrelsen', () => {
      expect(
        normalizeStaffingRequestPageLimit(
          500,
        ),
      ).toBe(
        MAX_STAFFING_REQUEST_PAGE_SIZE,
      );
    });

    it('giver administrator adgang til hele biografen', () => {
      expect(
        buildStaffingRequestVisibilityWhere(
          admin,
          7,
        ),
      ).toEqual({
        cinemaId: 7,
      });
    });

    it('begrænser medarbejderen til målrettede, egne og åbne fællesforespørgsler', () => {
      expect(
        buildStaffingRequestVisibilityWhere(
          employee,
          7,
        ),
      ).toEqual({
        cinemaId: 7,
        OR: [
          {
            targetUserId: 9,
          },
          {
            requestedByUserId:
              9,
          },
          {
            targetUserId:
              null,
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        ],
      });
    });

    it('bygger filter til aktive forespørgsler', () => {
      expect(
        buildPendingStaffingRequestWhere(
          employee,
          7,
        ),
      ).toEqual({
        cinemaId: 7,
        OR: [
          {
            targetUserId: 9,
          },
          {
            requestedByUserId:
              9,
          },
          {
            targetUserId:
              null,
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        ],
        status:
          StaffingRequestStatus.PENDING,
      });
    });

    it('bygger cursorfilter til behandlede forespørgsler', () => {
      expect(
        buildCompletedStaffingRequestWhere(
          employee,
          7,
          50,
        ),
      ).toEqual({
        cinemaId: 7,
        OR: [
          {
            targetUserId: 9,
          },
          {
            requestedByUserId:
              9,
          },
          {
            targetUserId:
              null,
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        ],
        status: {
          not:
            StaffingRequestStatus.PENDING,
        },
        id: {
          lt: 50,
        },
      });
    });

    it('beskytter målrettede gamle forespørgsler med samme adgangsregler', () => {
      expect(
        buildStaffingRequestTargetWhere(
          employee,
          7,
          31,
        ),
      ).toEqual({
        cinemaId: 7,
        OR: [
          {
            targetUserId: 9,
          },
          {
            requestedByUserId:
              9,
          },
          {
            targetUserId:
              null,
            jobFunction: {
              userJobFunctions: {
                some: {
                  cinemaId: 7,
                  userId: 9,
                },
              },
            },
          },
        ],
        id: 31,
      });
    });

    it('bygger næste cursor for behandlede forespørgsler', () => {
      expect(
        buildCompletedStaffingRequestPage(
          [
            {
              id: 12,
            },
            {
              id: 11,
            },
            {
              id: 10,
            },
          ],
          2,
        ),
      ).toEqual({
        items: [
          {
            id: 12,
          },
          {
            id: 11,
          },
        ],
        hasMore: true,
        nextBeforeId: 11,
      });
    });

    it('bruger akut statusværdi fra Prisma', () => {
      expect(
        StaffingRequestType.EMERGENCY,
      ).toBe('EMERGENCY');
    });
  },
);
