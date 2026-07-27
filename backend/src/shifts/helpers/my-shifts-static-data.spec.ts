import {
  findMyShiftsStaticData,
  myShiftsCinemaSettingsSelect,
  myShiftsColleagueSelect,
} from './my-shifts-static-data';

describe(
  'my shifts static data',
  () => {
    it('henter kun aktive kollegaer og to vagtbytteindstillinger', async () => {
      const users = [
        {
          id: 11,
          firstName: 'Anna',
          lastName: 'Jensen',
        },
      ];
      const cinemaSettings = {
        allowShiftTradePool:
          true,
        allowShiftTradeDirect:
          false,
      };
      const prisma = {
        user: {
          findMany:
            jest.fn().mockResolvedValue(
              users,
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
        users,
        cinemaSettings,
      });

      expect(
        prisma.user.findMany,
      ).toHaveBeenCalledWith({
        where: {
          id: {
            not: 9,
          },
          role: {
            not: 'MASTER',
          },
          isActive: true,
          cinemaMemberships: {
            some: {
              cinemaId: 7,
              isActive: true,
            },
          },
        },
        select:
          myShiftsColleagueSelect,
        orderBy: [
          {
            firstName: 'asc',
          },
          {
            lastName: 'asc',
          },
          {
            id: 'asc',
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
