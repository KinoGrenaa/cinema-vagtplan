import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let usersService: {
    findByEmailIncludingInactive:
      jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let prisma: {
    $transaction: jest.Mock;
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    cinema: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    userCinemaMembership: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    usersService = {
      findByEmailIncludingInactive:
        jest.fn(),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValue('token'),
    };
    prisma = {
      $transaction: jest.fn(
        async (
          callback: (value: any) => unknown,
        ) => callback(prisma),
      ),
      user: {
        findUnique: jest.fn(),
        update: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
      },
      cinema: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      userCinemaMembership: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    (prisma as any).$executeRaw =
      jest.fn().mockResolvedValue(1);

    service = new AuthService(
      usersService as never,
      jwtService as never,
      prisma as never,
    );
  });

  it('kan oprettes med eksplicitte afhængigheder', () => {
    expect(service).toBeDefined();
  });

  it('opdaterer standardbiograf atomisk og returnerer friske muligheder', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 7,
        role: 'EMPLOYEE',
        cinemaId: 2,
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 7,
        role: 'EMPLOYEE',
        cinemaId: 2,
        defaultCinemaId: 3,
        isActive: true,
      });
    prisma.userCinemaMembership.findFirst.mockResolvedValue(
      {
        id: 11,
      },
    );
    prisma.userCinemaMembership.findMany.mockResolvedValue(
      [
        {
          cinema: {
            id: 2,
            name: 'Kino Grenaa',
            logoUrl: null,
          },
        },
        {
          cinema: {
            id: 3,
            name: 'Kino Nord',
            logoUrl: null,
          },
        },
      ],
    );

    await expect(
      service.updateDefaultCinema(
        7,
        3,
      ),
    ).resolves.toMatchObject({
      role: 'EMPLOYEE',
      homeCinemaId: 2,
      defaultCinemaId: 3,
      allowNoDefault: false,
    });

    expect(
      prisma.$transaction,
    ).toHaveBeenCalledTimes(1);
    expect(
      prisma.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
      data: {
        defaultCinemaId: 3,
      },
    });
  });

  it('reparerer utilgængelig standardbiograf til hjemmebiograf ved login', async () => {
    const user = {
      id: 7,
      email: 'anna@example.com',
      password: 'hash',
      firstName: 'Anna',
      lastName: 'Andersen',
      role: 'EMPLOYEE',
      cinemaId: 2,
      defaultCinemaId: 3,
      isActive: true,
    };
    usersService.findByEmailIncludingInactive.mockResolvedValue(
      user,
    );
    (
      bcrypt.compare as jest.Mock
    ).mockResolvedValue(true);
    prisma.userCinemaMembership.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        cinema: {
          id: 2,
          name: 'Kino Grenaa',
          logoUrl: null,
        },
      })
      .mockResolvedValueOnce({
        id: 12,
      });
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: 'EMPLOYEE',
      cinemaId: 2,
      isActive: true,
    });

    await expect(
      service.login(
        'anna@example.com',
        'password',
      ),
    ).resolves.toMatchObject({
      access_token: 'token',
      user: {
        id: 7,
        cinemaId: 2,
        defaultCinemaId: 2,
      },
      defaultCinema: {
        id: 2,
      },
    });

    expect(
      prisma.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
      data: {
        defaultCinemaId: 2,
      },
    });
  });

  it('afviser skift til en biograf uden aktivt medlemskab', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'anna@example.com',
      firstName: 'Anna',
      lastName: 'Andersen',
      role: 'EMPLOYEE',
      cinemaId: 2,
      defaultCinemaId: 2,
      isActive: true,
    });
    prisma.userCinemaMembership.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      service.switchCinema(7, 3),
    ).rejects.toThrow(
      ForbiddenException,
    );

    expect(
      jwtService.signAsync,
    ).not.toHaveBeenCalled();
  });
});
