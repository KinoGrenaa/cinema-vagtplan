import {
  StaffingRequestStatus,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  addStaffingAcceptanceConflicts,
} from './staffing-request-acceptance-preview';

describe(
  'staffing request acceptance preview',
  () => {
    it('finder den overlappende vagt før accept', async () => {
      const prisma = {
        shift: {
          findMany:
            jest.fn().mockResolvedValue([
              {
                id: 44,
                startTime:
                  new Date(
                    '2026-09-13T15:30:00.000Z',
                  ),
                endTime:
                  new Date(
                    '2026-09-13T18:05:00.000Z',
                  ),
                jobFunctionNameSnapshot:
                  'B Vagt Weekend',
                jobFunction:
                  null,
              },
            ]),
        },
      };

      const [result] =
        await addStaffingAcceptanceConflicts(
          prisma as unknown as PrismaService,
          {
            sub: 9,
            email:
              'test@example.com',
            role:
              'EMPLOYEE',
            cinemaId: 7,
          },
          [
            {
              status:
                StaffingRequestStatus.PENDING,
              targetUserId:
                9,
              shiftId:
                55,
              requestStartTime:
                null,
              requestEndTime:
                null,
              shift: {
                startTime:
                  new Date(
                    '2026-09-13T09:05:00.000Z',
                  ),
                endTime:
                  new Date(
                    '2026-09-13T17:35:00.000Z',
                  ),
              },
            },
          ],
        );

      expect(
        result.acceptanceConflictShift,
      ).toMatchObject({
        id: 44,
        title:
          'B Vagt Weekend',
      });
      expect(
        prisma.shift.findMany,
      ).toHaveBeenCalledTimes(1);
    });
  },
);
