import {
  findScheduleStaticData,
  scheduleStaticUserSelect,
  scheduleStaticJobFunctionSelect,
} from './schedule-static-data';
describe(
  'schedule static data',
  () => {
    it('henter kun aktive biografmedlemmer og aktive jobfunktioner', async () => {
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
      const jobFunctions = [
        {
          id: 3,
          name: 'Kiosk',
          color: '#2563eb',
          sortOrder: 0,
        },
      ];
      const prisma = {
        userCinemaMembership: {
          findMany:
            jest.fn().mockResolvedValue(
              memberships,
            ),
        },
        jobFunction: {
          findMany:
            jest.fn().mockResolvedValue(
              jobFunctions,
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
        jobFunctions,
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
            select: {
              ...scheduleStaticUserSelect,
              userJobFunctions: {
                where: {
                  cinemaId: 7,
                },
                select: {
                  jobFunctionId: true,
                },
              },
            },
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
        prisma.jobFunction.findMany,
      ).toHaveBeenCalledWith({
        where: {
          cinemaId: 7,
          isActive: true,
        },
        select:
          scheduleStaticJobFunctionSelect,
        orderBy: [
          {
            sortOrder: 'asc',
          },
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
