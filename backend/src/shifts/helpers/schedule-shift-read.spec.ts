import {
  findScheduleShiftsForDay,
  scheduleShiftSelect,
} from './schedule-shift-read';
import {
  getCopenhagenDayRange,
} from './shift-service-helpers';

describe(
  'schedule shift read',
  () => {
    it('henter kun dagsvagter og nødvendige relationfelter', async () => {
      const prisma = {
        shift: {
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

      await findScheduleShiftsForDay(
        prisma as never,
        7,
        '2026-10-25',
      );

      expect(
        prisma.shift.findMany,
      ).toHaveBeenCalledWith({
        where: {
          cinemaId: 7,
          AND: [
            {
              startTime: {
                lt: range.end,
              },
            },
            {
              endTime: {
                gt: range.start,
              },
            },
          ],
        },
        select:
          scheduleShiftSelect,
        orderBy: [
          {
            startTime: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });
    });

    it('bevarer den lange København-dag ved skift til vintertid', () => {
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
