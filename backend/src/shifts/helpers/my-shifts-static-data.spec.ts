import {
  findMyShiftsStaticData,
  myShiftsCinemaSettingsSelect,
  myShiftsColleagueSelect,
} from './my-shifts-static-data';

describe(
  'my shifts static data',
  () => {
    it('henter aktive kollegaer fra aktive memberships', async () => {
      const users = [
        {
          id: 11,
          firstName: 'Anna',
          lastName: 'Jensen',
          profileImage: '/uploads/profiles/anna.jpg',
          userJobFunctions: [
            {
              cinemaId: 7,
              jobFunctionId: 21,
            },
            {
              cinemaId: 8,
              jobFunctionId: 99,
            },
          ],
        },
      ];
      const cinemaSettings = {
        allowShiftTradePool:
          true,
        allowShiftTradeDirect:
          false,
      };
      const prisma = {
        userCinemaMembership: {
          findMany:
            jest.fn().mockResolvedValue(
              users.map(
                (user) => ({
                  user,
                }),
              ),
            ),
        },
        cinema: {
          findUnique:
            jest.fn().mockResolvedValue(
              cinemaSettings,
            ),
        },
      };

      await expect(
        findMyShiftsStaticData(
          prisma as never,
          {
            userId: 9,
            cinemaId: 7,
          },
        ),
      ).resolves.toEqual({
        users: [
          {
            id: 11,
            firstName: 'Anna',
            lastName: 'Jensen',
            profileImage: '/uploads/profiles/anna.jpg',
            jobFunctionIds: [21],
          },
        ],
        cinemaSettings,
      });

      expect(
        prisma.userCinemaMembership.findMany,
      ).toHaveBeenCalledWith({
        where: {
          cinemaId: 7,
          isActive: true,
          userId: {
            not: 9,
          },
          user: {
            role: {
              not: 'MASTER',
            },
            isActive: true,
          },
        },
        select: {
          user: {
            select:
              myShiftsColleagueSelect,
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
        prisma.cinema.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: 7,
        },
        select:
          myShiftsCinemaSettingsSelect,
      });
    });
  },
);
