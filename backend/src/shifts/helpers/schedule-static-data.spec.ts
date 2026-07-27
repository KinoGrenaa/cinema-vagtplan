import {
  findScheduleStaticData,
  scheduleStaticUserSelect,
  scheduleStaticWorkTypeSelect,
} from './schedule-static-data';

describe(
  'schedule static data',
  () => {
    it('henter kun aktive biografmedlemmer og aktive vagttyper', async () => {
      const memberships = [
        {
          role: 'EMPLOYEE',
          user: {
            id: 11,
            email:
              'anna@example.com',
            firstName:
              'Anna',
            lastName:
              'Jensen',
            profileImage:
              null,
          },
        },
      ];
      const workTypes = [
        {
          id: 3,
          name: 'Kiosk',
          color: '#2563eb',
        },
      ];
      const prisma = {
        userCinemaMembership: {
          findMany:
            jest.fn().mockResolvedValue(
              memberships,
            ),
        },
        workType: {
          findMany:
            jest.fn().mockResolvedValue(
              workTypes,
            ),
        },
      };

      await expect(
        findScheduleStaticData(
          prisma as never,
          7,
        ),
      ).resolves.toEqual({
        users: [
          {
            ...memberships[0]
              .user,
            role: 'EMPLOYEE',
            cinemaId: 7,
          },
        ],
        workTypes,
      });

      expect(
        prisma.userCinemaMembership.findMany,
      ).toHaveBeenCalledWith({
        where: {
          cinemaId: 7,
          isActive: true,
          user: {
            isActive: true,
            role: {
              not: 'MASTER',
            },
          },
        },
        select: {
          role: true,
          user: {
            select:
              scheduleStaticUserSelect,
          },
        },
        orderBy: [
          {
            user: {
              firstName: 'asc',
            },
          },
          {
            user: {
              lastName: 'asc',
            },
          },
          {
            userId: 'asc',
          },
        ],
      });

      expect(
        prisma.workType.findMany,
      ).toHaveBeenCalledWith({
        where: {
          cinemaId: 7,
          isActive: true,
        },
        select:
          scheduleStaticWorkTypeSelect,
        orderBy: [
          {
            name: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });
    });
  },
);
