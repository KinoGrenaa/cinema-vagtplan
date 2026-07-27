import {
  TimeEntryStatus,
} from '@prisma/client';

import {
  findScheduleTimeEntriesForDay,
  scheduleTimeEntrySelect,
} from './schedule-time-entry-read';
import {
  getCopenhagenDayRange,
} from '../../shifts/helpers/shift-service-helpers';

describe(
  'schedule time-entry read',
  () => {
    it('henter kun ikke-voidede registreringer for egne dagsvagter', async () => {
      const prisma = {
        timeEntry: {
          findMany:
            jest.fn().mockResolvedValue(
              [],
            ),
        },
      };
      const range =
        getCopenhagenDayRange(
          '2026-10-25',
        );

      await findScheduleTimeEntriesForDay(
        prisma as never,
        {
          userId: 9,
          cinemaId: 7,
          date: '2026-10-25',
        },
      );

      expect(
        prisma.timeEntry.findMany,
      ).toHaveBeenCalledWith({
        where: {
          userId: 9,
          cinemaId: 7,
          status: {
            not:
              TimeEntryStatus.VOIDED,
          },
          shift: {
            is: {
              startTime: {
                lt: range.end,
              },
              endTime: {
                gt: range.start,
              },
            },
          },
        },
        select:
          scheduleTimeEntrySelect,
        orderBy: [
          {
            clockIn: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      });
    });

    it('bevarer København-døgnet på 25 timer', () => {
      const {
        start,
        end,
      } = getCopenhagenDayRange(
        '2026-10-25',
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
