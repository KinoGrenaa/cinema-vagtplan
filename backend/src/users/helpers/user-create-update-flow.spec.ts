import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CinemaRole,
  EmploymentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createUserFlow } from './user-create-flow';
import {
  updateOwnProfileFlow,
  updateThemeFlow,
  updateUserFlow,
} from './user-update-flow';

jest.mock('bcrypt', () => ({
  hash: jest
    .fn()
    .mockResolvedValue(
      'hashed-password',
    ),
}));

const master = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER' as const,
  cinemaId: null,
};

const admin = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN' as const,
  cinemaId: 7,
};

function createPrisma(
  transaction: Record<string, unknown>,
) {
  return {
    $transaction: jest.fn(
      async (
        callback: (value: any) => unknown,
      ) => callback(transaction),
    ),
  };
}

function membership(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 11,
    userId: 9,
    cinemaId: 7,
    role: CinemaRole.EMPLOYEE,
    employmentType:
      EmploymentType.HOURLY,
    isActive: true,
    deactivatedAt: null,
    canManageSchedule: false,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests: false,
    canManageCinemaSettings: false,
    canSendBroadcastMessages: false,
    ...overrides,
  };
}

describe('user create and update flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new global account and cinema-scoped membership in one transaction', async () => {
    const createdUser = {
      id: 9,
      email: 'anna@example.com',
      firstName: 'Anna',
      lastName: 'Andersen',
      phone: null,
      role: 'EMPLOYEE',
      employmentType: 'HOURLY',
      cinemaId: 7,
      defaultCinemaId: 7,
      isActive: true,
      deactivatedAt: null,
      canManageSchedule: false,
      canManageUsers: false,
      canManagePayroll: false,
      canManageLeaveRequests: false,
      canManageCinemaSettings: false,
      canSendBroadcastMessages: false,
    };
    const createdMembership = membership();
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue(
            createdUser,
          ),
      },
      userCinemaMembership: {
        create: jest
          .fn()
          .mockResolvedValue(
            createdMembership,
          ),
        findUnique: jest.fn(),
      },
    };
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue({
          id: 1,
        }),
    };

    await expect(
      createUserFlow(
        createPrisma(
          transaction,
        ) as never,
        auditLogsService as never,
        {
          email: 'anna@example.com',
          password: 'password123',
          firstName: 'Anna',
          lastName: 'Andersen',
          cinemaId: 7,
        },
        master,
      ),
    ).resolves.toMatchObject({
      id: 9,
      email: 'anna@example.com',
      role: CinemaRole.EMPLOYEE,
      cinemaId: 7,
      defaultCinemaId: 7,
      employmentType:
        EmploymentType.HOURLY,
      isActive: true,
    });

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);
    expect(
      transaction.cinema.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
      select: {
        id: true,
      },
    });
    expect(
      transaction.user.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'anna@example.com',
        password: 'hashed-password',
        cinemaId: 7,
        defaultCinemaId: 7,
      }),
    });
    expect(
      transaction.userCinemaMembership.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 9,
        cinemaId: 7,
        role: CinemaRole.EMPLOYEE,
        employmentType:
          EmploymentType.HOURLY,
        isActive: true,
      }),
    });
  });

  it('automatically links an existing person to another cinema without overwriting profile data', async () => {
    const existingUser = {
      id: 9,
      email: 'anna@example.com',
      firstName: 'Anna',
      lastName: 'Andersen',
      phone: '12345678',
      role: 'ADMIN',
      employmentType: 'SALARIED',
      cinemaId: 8,
      defaultCinemaId: 8,
      isActive: false,
      deactivatedAt: new Date(
        '2026-07-01T08:00:00.000Z',
      ),
      canManageSchedule: true,
      canManageUsers: true,
      canManagePayroll: true,
      canManageLeaveRequests: true,
      canManageCinemaSettings: true,
      canSendBroadcastMessages: true,
    };
    const reactivatedAccount = {
      ...existingUser,
      isActive: true,
      deactivatedAt: null,
    };
    const createdMembership = membership({
      role: CinemaRole.EMPLOYEE,
      employmentType:
        EmploymentType.HOURLY,
    });
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            existingUser,
          ),
        create: jest.fn(),
        update: jest
          .fn()
          .mockResolvedValue(
            reactivatedAccount,
          ),
      },
      userCinemaMembership: {
        findUnique: jest
          .fn()
          .mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue(
            createdMembership,
          ),
      },
    };
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue({
          id: 1,
        }),
    };

    await expect(
      createUserFlow(
        createPrisma(
          transaction,
        ) as never,
        auditLogsService as never,
        {
          email: 'anna@example.com',
          password: 'new-password',
          firstName: 'Forkert',
          lastName: 'Navn',
          cinemaId: 7,
          role: 'EMPLOYEE',
          employmentType: 'HOURLY',
        },
        master,
      ),
    ).resolves.toMatchObject({
      id: 9,
      firstName: 'Anna',
      lastName: 'Andersen',
      phone: '12345678',
      role: CinemaRole.EMPLOYEE,
      cinemaId: 7,
      defaultCinemaId: 8,
      employmentType:
        EmploymentType.HOURLY,
      isActive: true,
    });

    expect(
      transaction.user.create,
    ).not.toHaveBeenCalled();
    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        isActive: true,
        deactivatedAt: null,
      },
    });
    expect(
      transaction.userCinemaMembership.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 9,
        cinemaId: 7,
        role: CinemaRole.EMPLOYEE,
      }),
    });
    expect(
      auditLogsService.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        action:
          'LINK_EXISTING_USER_TO_CINEMA',
        entityId: 9,
        cinemaId: 7,
      }),
    );
  });

  it('rejects an email that is already actively linked to the same cinema', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            role: 'EMPLOYEE',
          }),
        create: jest.fn(),
      },
      userCinemaMembership: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 11,
            isActive: true,
          }),
        create: jest.fn(),
      },
    };

    await expect(
      createUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        {
          email: 'anna@example.com',
          password: 'password123',
          firstName: 'Anna',
          lastName: 'Andersen',
          cinemaId: 7,
        },
        master,
      ),
    ).rejects.toThrow(
      'Brugeren er allerede tilknyttet denne biograf',
    );

    expect(
      transaction.userCinemaMembership.create,
    ).not.toHaveBeenCalled();
  });

  it('requires explicit reactivation when the same cinema membership is inactive', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            role: 'EMPLOYEE',
          }),
        create: jest.fn(),
      },
      userCinemaMembership: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 11,
            isActive: false,
          }),
        create: jest.fn(),
      },
    };

    await expect(
      createUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        {
          email: 'anna@example.com',
          password: 'password123',
          firstName: 'Anna',
          lastName: 'Andersen',
          cinemaId: 7,
        },
        master,
      ),
    ).rejects.toThrow(
      'Brugeren findes allerede i denne biograf og skal genaktiveres',
    );

    expect(
      transaction.userCinemaMembership.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects ordinary users on the legacy global update endpoint', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            email: 'anna@example.com',
            firstName: 'Anna',
            lastName: 'Andersen',
            role: 'EMPLOYEE',
            cinemaId: 7,
            isActive: true,
          }),
        update: jest.fn(),
      },
    };

    await expect(
      updateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        {
          firstName: 'Anne',
        },
        master,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
  });

  it('updates own profile inside directory and user locks', async () => {
    const updatedUser = {
      id: 9,
      email: 'ny@example.com',
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
          }),
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        update: jest
          .fn()
          .mockResolvedValue(
            updatedUser,
          ),
      },
    };

    await expect(
      updateOwnProfileFlow(
        createPrisma(
          transaction,
        ) as never,
        9,
        {
          email: 'ny@example.com',
          password: 'nyt-password',
        },
      ),
    ).resolves.toEqual(updatedUser);

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(2);
    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        email: 'ny@example.com',
        password:
          'hashed-password',
      },
    });
    expect(bcrypt.hash).toHaveBeenCalled();
  });

  it('updates theme behind the per-user lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        update: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            theme: 'dark',
          }),
      },
    };

    await expect(
      updateThemeFlow(
        createPrisma(
          transaction,
        ) as never,
        9,
        'dark',
      ),
    ).resolves.toEqual({
      id: 9,
      theme: 'dark',
    });

    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        theme: 'dark',
      },
    });
  });
});
