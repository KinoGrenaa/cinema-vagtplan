import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

function sessionMembership(
  cinemaId: number,
  role: 'ADMIN' | 'EMPLOYEE',
  name: string,
  permissions: Partial<{
    canManageSchedule: boolean;
    canManageUsers: boolean;
    canManagePayroll: boolean;
    canManageLeaveRequests: boolean;
    canManageCinemaSettings: boolean;
    canSendBroadcastMessages: boolean;
  }> = {},
) {
  return {
    cinemaId,
    role,
    canManageSchedule: false,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests: false,
    canManageCinemaSettings: false,
    canSendBroadcastMessages: false,
    cinema: {
      id: cinemaId,
      name,
      logoUrl: null,
    },
    ...permissions,
  };
}

describe('AuthService', () => {
  let usersService: {
    findByEmailIncludingInactive: jest.Mock;
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
    (prisma as any).$executeRaw = jest
      .fn()
      .mockResolvedValue(1);

    service = new AuthService(
      usersService as never,
      jwtService as never,
      prisma as never,
    );
  });

  it('uses the default membership role and permissions at login', async () => {
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
    const membership = sessionMembership(
      3,
      'ADMIN',
      'Kino Nord',
      {
        canManagePayroll: true,
      },
    );

    usersService.findByEmailIncludingInactive.mockResolvedValue(
      user,
    );
    (
      bcrypt.compare as jest.Mock
    ).mockResolvedValue(true);
    prisma.userCinemaMembership.findFirst.mockResolvedValue(
      membership,
    );

    await expect(
      service.login(
        'anna@example.com',
        'password',
      ),
    ).resolves.toMatchObject({
      access_token: 'token',
      user: {
        id: 7,
        role: 'ADMIN',
        cinemaId: 3,
        defaultCinemaId: 3,
        canManagePayroll: true,
      },
      defaultCinema: {
        id: 3,
      },
    });

    expect(
      jwtService.signAsync,
    ).toHaveBeenCalledWith({
      sub: 7,
      email: 'anna@example.com',
      role: 'ADMIN',
      cinemaId: 3,
    });
  });

  it('repairs an unavailable default to another active membership', async () => {
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
    const fallbackMembership =
      sessionMembership(
        2,
        'EMPLOYEE',
        'Kino Grenaa',
      );

    usersService.findByEmailIncludingInactive.mockResolvedValue(
      user,
    );
    (
      bcrypt.compare as jest.Mock
    ).mockResolvedValue(true);
    prisma.userCinemaMembership.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        fallbackMembership,
      )
      .mockResolvedValueOnce({
        id: 1,
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
      user: {
        role: 'EMPLOYEE',
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

  it('changes role and permissions when switching cinema', async () => {
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
    prisma.userCinemaMembership.findFirst
      .mockResolvedValueOnce(
        sessionMembership(
          3,
          'ADMIN',
          'Kino Nord',
          {
            canManageUsers: true,
          },
        ),
      )
      .mockResolvedValueOnce(
        sessionMembership(
          2,
          'EMPLOYEE',
          'Kino Grenaa',
        ),
      );

    await expect(
      service.switchCinema(7, 3),
    ).resolves.toMatchObject({
      user: {
        role: 'ADMIN',
        cinemaId: 3,
        canManageUsers: true,
      },
      selectedCinema: {
        id: 3,
      },
      defaultCinema: {
        id: 2,
      },
    });

    expect(
      jwtService.signAsync,
    ).toHaveBeenCalledWith({
      sub: 7,
      email: 'anna@example.com',
      role: 'ADMIN',
      cinemaId: 3,
    });
  });

  it('rejects switch to a cinema without an active membership', async () => {
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
    ).rejects.toThrow(ForbiddenException);

    expect(
      jwtService.signAsync,
    ).not.toHaveBeenCalled();
  });
});
