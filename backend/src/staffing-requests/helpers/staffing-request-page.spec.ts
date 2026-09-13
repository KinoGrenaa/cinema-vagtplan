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

    it('begrænser medarbejderen til målrettede, egne og ikke-afviste fællesforespørgsler', () => {
      const where =
        buildStaffingRequestVisibilityWhere(
          employee,
          7,
        );

      expect(where).toMatchObject({
        cinemaId: 7,
      });
      expect(where.OR).toHaveLength(3);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          {
            targetUserId: 9,
          },
          {
            requestedByUserId: 9,
          },
          expect.objectContaining({
            targetUserId:
              null,
            declines: {
              none: {
                userId: 9,
              },
            },
          }),
        ]),
      );
    });

    it('bygger filter til aktive forespørgsler', () => {
      const where =
        buildPendingStaffingRequestWhere(
          employee,
          7,
        );

      expect(where).toMatchObject({
        cinemaId: 7,
        status:
          StaffingRequestStatus.PENDING,
      });
      expect(where.OR).toHaveLength(3);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          {
            targetUserId: 9,
          },
          {
            requestedByUserId: 9,
          },
          expect.objectContaining({
            targetUserId:
              null,
            declines: {
              none: {
                userId: 9,
              },
            },
          }),
        ]),
      );
    });

    it('bygger cursorfilter til behandlede forespørgsler', () => {
      const where =
        buildCompletedStaffingRequestWhere(
          employee,
          7,
          50,
        );

      expect(where).toMatchObject({
        cinemaId: 7,
        status: {
          not:
            StaffingRequestStatus.PENDING,
        },
        id: {
          lt: 50,
        },
      });
      expect(where.OR).toHaveLength(3);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            targetUserId:
              null,
            declines: {
              none: {
                userId: 9,
              },
            },
          }),
        ]),
      );
    });

    it('beskytter deep-links med samme synlighedsregler', () => {
      const where =
        buildStaffingRequestTargetWhere(
          employee,
          7,
          31,
        );

      expect(where).toMatchObject({
        cinemaId: 7,
        id: 31,
      });
      expect(where.OR).toHaveLength(3);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            targetUserId:
              null,
            declines: {
              none: {
                userId: 9,
              },
            },
          }),
        ]),
      );
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
