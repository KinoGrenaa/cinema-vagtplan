import { MovieShowingsService } from './movie-showings.service';

function createActiveMovieShowingUser() {
  return {
    id: 7,
    role: 'ADMIN',
    cinemaMemberships: [
      {
        role: 'EMPLOYEE',
      },
    ],
  };
}

describe('MovieShowingsService', () => {
  it('bruger eksklusive døgnkanter og stabil sortering', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            createActiveMovieShowingUser(),
          ),
      },
      cinema: {
        findUnique: jest.fn(),
      },
      movieShowing: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
      },
    };
    const service =
      new MovieShowingsService(
        prisma as never,
      );

    await service.findAll({
      date: '2026-07-21',
      user: {
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 2,
      },
    });

    expect(
      prisma.movieShowing.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 2,
        startTime: {
          lt: new Date(
            '2026-07-21T22:00:00.000Z',
          ),
        },
        endTime: {
          gt: new Date(
            '2026-07-20T22:00:00.000Z',
          ),
        },
      },
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

  it('afviser ugyldige datoer før databaseopslag af visninger', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            createActiveMovieShowingUser(),
          ),
      },
      cinema: {
        findUnique: jest.fn(),
      },
      movieShowing: {
        findMany: jest.fn(),
      },
    };
    const service =
      new MovieShowingsService(
        prisma as never,
      );

    await expect(
      service.findAll({
        date: '2026-02-30',
        user: {
          sub: 7,
          role: 'EMPLOYEE',
          cinemaId: 2,
        },
      }),
    ).rejects.toThrow(
      'Dato skal være en gyldig dato',
    );

    expect(
      prisma.movieShowing.findMany,
    ).not.toHaveBeenCalled();
  });
});
