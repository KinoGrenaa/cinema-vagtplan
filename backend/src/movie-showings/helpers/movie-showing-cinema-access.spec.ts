import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  resolveMovieShowingsCinemaId,
} from './movie-showing-cinema-access';

describe('resolveMovieShowingsCinemaId', () => {
  it('tillader aktivt sekundært medlemskab', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 7,
            role: 'EMPLOYEE',
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      resolveMovieShowingsCinemaId(
        prisma as never,
        {
          sub: 7,
          role: 'EMPLOYEE',
          cinemaId: 2,
        },
      ),
    ).resolves.toBe(2);

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 7,
          isActive: true,
          OR: expect.arrayContaining([
            expect.objectContaining({
              cinemaMemberships:
                expect.objectContaining({
                  some: {
                    cinemaId: 2,
                    isActive: true,
                  },
                }),
            }),
          ]),
        }),
      }),
    );
  });

  it('afviser fremmed valgt biograf for medarbejder', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn(),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      resolveMovieShowingsCinemaId(
        prisma as never,
        {
          sub: 7,
          role: 'EMPLOYEE',
          cinemaId: 2,
        },
        3,
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('kræver valgt biograf for MASTER', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn(),
      },
      cinema: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      resolveMovieShowingsCinemaId(
        prisma as never,
        {
          sub: 1,
          role: 'MASTER',
          cinemaId: null,
        },
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
