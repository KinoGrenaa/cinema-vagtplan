import {
  LeaveStatus,
} from '@prisma/client';

import {
  buildScheduleLeaveRequestWhere,
  findScheduleLeaveRequestsForDay,
  scheduleLeaveRequestSelect,
} from './schedule-leave-request-read';
import {
  getCopenhagenDateStart,
} from './leave-request-page';

describe(
  'schedule leave-request read',
  () => {
    it('henter hele biografens aktive fravær for en administrator', async () => {
      const prisma = {
        leaveRequest: {
          findMany:
            jest.fn().mockResolvedValue(
              [],
            ),
        },
      };
      const start =
        getCopenhagenDateStart(
          '2026-10-25',
        );
      const end =
        getCopenhagenDateStart(
          '2026-10-25',
          1,
        );

      await findScheduleLeaveRequestsForDay(
        prisma as never,
        {
          sub: 9,
          role: 'ADMIN',
          cinemaId: 7,
        },
        7,
        '2026-10-25',
      );

      expect(
        prisma.leaveRequest.findMany,
      ).toHaveBeenCalledWith({
        where: {
          cinemaId: 7,
          status: {
            in: [
              LeaveStatus.PENDING,
              LeaveStatus.APPROVED,
            ],
          },
          startDate: {
            lt: end,
          },
          endDate: {
            gt: start,
          },
        },
        select:
          scheduleLeaveRequestSelect,
        orderBy: [
          {
            startDate: 'asc',
          },
          {
            userId: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });
    });

    it('begrænser en medarbejder til eget fravær', () => {
      expect(
        buildScheduleLeaveRequestWhere(
          {
            sub: 12,
            role:
              'EMPLOYEE',
            cinemaId: 7,
          },
          7,
          '2026-08-10',
        ),
      ).toEqual(
        expect.objectContaining({
          cinemaId: 7,
          userId: 12,
        }),
      );
    });

    it('bevarer København-døgnet på 25 timer', () => {
      const start =
        getCopenhagenDateStart(
          '2026-10-25',
        );
      const end =
        getCopenhagenDateStart(
          '2026-10-25',
          1,
        );

      expect(
        end.getTime() -
          start.getTime(),
      ).toBe(
        25 * 60 * 60 * 1000,
      );
    });
  },
);
