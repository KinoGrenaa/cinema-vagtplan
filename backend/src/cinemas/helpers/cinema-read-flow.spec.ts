import {
  findAllCinemas,
} from './cinema-read-flow';

describe('cinema read flow', () => {
  it('beregner aktive og inaktive brugere fra biograftilknytninger', async () => {
    const prisma = {
      cinema: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 2,
              name: 'Kino Grenaa',
              _count: {
                shifts: 10,
                workTypes: 3,
              },
            },
            {
              id: 3,
              name: 'Kino Nord',
              _count: {
                shifts: 4,
                workTypes: 2,
              },
            },
          ]),
      },
      userCinemaMembership: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              cinemaId: 2,
              isActive: true,
              user: {
                isActive: true,
              },
            },
            {
              cinemaId: 2,
              isActive: false,
              user: {
                isActive: true,
              },
            },
            {
              cinemaId: 2,
              isActive: true,
              user: {
                isActive: false,
              },
            },
            {
              cinemaId: 3,
              isActive: true,
              user: {
                isActive: true,
              },
            },
          ]),
      },
    };

    await expect(
      findAllCinemas(
        prisma as never,
      ),
    ).resolves.toEqual([
      {
        id: 2,
        name: 'Kino Grenaa',
        _count: {
          shifts: 10,
          workTypes: 3,
          users: 3,
        },
        activeUserCount: 1,
        inactiveUserCount: 2,
      },
      {
        id: 3,
        name: 'Kino Nord',
        _count: {
          shifts: 4,
          workTypes: 2,
          users: 1,
        },
        activeUserCount: 1,
        inactiveUserCount: 0,
      },
    ]);

    expect(
      prisma.userCinemaMembership
        .findMany,
    ).toHaveBeenCalledWith({
      where: {
        user: {
          role: {
            not: 'MASTER',
          },
        },
      },
      select: {
        cinemaId: true,
        isActive: true,
        user: {
          select: {
            isActive: true,
          },
        },
      },
    });
  });
});
