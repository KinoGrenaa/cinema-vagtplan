import {
  LeaveStatus,
} from '@prisma/client';

import {
  buildLeaveRequestDateWhere,
  buildLeaveRequestPage,
  buildLeaveRequestPageWhere,
  buildLeaveRequestTargetWhere,
  buildLeaveRequestVisibilityWhere,
  getCopenhagenDateStart,
  MAX_LEAVE_REQUEST_PAGE_SIZE,
  normalizeLeaveRequestPageLimit,
} from './leave-request-page';

describe(
  'leave-request pagination',
  () => {
    const employee = {
      sub: 9,
      role: 'EMPLOYEE' as const,
      cinemaId: 7,
    };
    const admin = {
      sub: 2,
      role: 'ADMIN' as const,
      cinemaId: 7,
    };

    it('begrænser sidestørrelsen', () => {
      expect(
        normalizeLeaveRequestPageLimit(
          500,
        ),
      ).toBe(
        MAX_LEAVE_REQUEST_PAGE_SIZE,
      );
    });

    it('begrænser medarbejderen til egne ansøgninger', () => {
      expect(
        buildLeaveRequestVisibilityWhere(
          employee,
          7,
          false,
        ),
      ).toEqual({
        cinemaId: 7,
        userId: 9,
      });
    });

    it('giver administrator adgang til hele biografen med includeAll', () => {
      expect(
        buildLeaveRequestVisibilityWhere(
          admin,
          7,
          true,
        ),
      ).toEqual({
        cinemaId: 7,
      });
    });

    it('bygger status- og cursorfilter', () => {
      expect(
        buildLeaveRequestPageWhere(
          employee,
          7,
          {
            statuses: [
              LeaveStatus.PENDING,
              LeaveStatus.APPROVED,
            ],
            beforeId: 50,
          },
        ),
      ).toEqual({
        cinemaId: 7,
        userId: 9,
        status: {
          in: [
            LeaveStatus.PENDING,
            LeaveStatus.APPROVED,
          ],
        },
        id: {
          lt: 50,
        },
      });
    });

    it('bruger samme adgangsregel for målrettede deep-links', () => {
      expect(
        buildLeaveRequestTargetWhere(
          employee,
          7,
          {
            targetId: 31,
          },
        ),
      ).toEqual({
        cinemaId: 7,
        userId: 9,
        id: 31,
      });
    });

    it('bygger overlappende datofilter med eksklusiv slutgrænse', () => {
      const where =
        buildLeaveRequestDateWhere(
          '2026-03-29',
          '2026-03-29',
        );

      expect(where).toEqual({
        AND: [
          {
            endDate: {
              gte:
                getCopenhagenDateStart(
                  '2026-03-29',
                ),
            },
          },
          {
            startDate: {
              lt:
                getCopenhagenDateStart(
                  '2026-03-29',
                  1,
                ),
            },
          },
        ],
      });

      const [
        startFilter,
        endFilter,
      ] =
        where.AND as Array<{
          endDate?: {
            gte: Date;
          };
          startDate?: {
            lt: Date;
          };
        }>;

      expect(
        endFilter.startDate?.lt.getTime() -
          startFilter.endDate?.gte.getTime(),
      ).toBe(
        23 *
          60 *
          60 *
          1000,
      );
    });

    it('bygger næste cursor', () => {
      expect(
        buildLeaveRequestPage(
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
  },
);
