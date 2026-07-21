import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

describe('user create and update flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates cinema and email inside the create transaction', async () => {
    const createdUser = {
      id: 9,
      email: 'anna@example.com',
      firstName: 'Anna',
      lastName: 'Andersen',
      role: 'EMPLOYEE',
      cinemaId: 7,
      isActive: true,
    };
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
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 1,
          }),
      },
      userCinemaMembership: {
        upsert: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
        updateMany: jest.fn(),
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
          email:
            'anna@example.com',
          password: 'password123',
          firstName: 'Anna',
          lastName: 'Andersen',
          cinemaId: 7,
        },
        master,
      ),
    ).resolves.toEqual(
      createdUser,
    );

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
      transaction.user.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        email:
          'anna@example.com',
      },
    });
    expect(
      transaction.user.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email:
          'anna@example.com',
        password:
          'hashed-password',
        cinemaId: 7,
      }),
    });
  });

  it('rejects a duplicate email before create', async () => {
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
            id: 8,
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
          email:
            'anna@example.com',
          password: 'password123',
          firstName: 'Anna',
          lastName: 'Andersen',
          cinemaId: 7,
        },
        master,
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transaction.user.create,
    ).not.toHaveBeenCalled();
  });

  it('locks and revalidates the target before administrator update', async () => {
    const updatedUser = {
      id: 9,
      email: 'ny@example.com',
      firstName: 'Anna',
      lastName: 'Andersen',
      role: 'EMPLOYEE',
      cinemaId: 7,
      isActive: true,
    };
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
            ...updatedUser,
            email:
              'gammel@example.com',
          }),
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        update: jest
          .fn()
          .mockResolvedValue(
            updatedUser,
          ),
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 1,
          }),
      },
      userCinemaMembership: {
        upsert: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
        updateMany: jest.fn(),
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
      updateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        auditLogsService as never,
        9,
        {
          email:
            'ny@example.com',
        },
        admin,
      ),
    ).resolves.toEqual(
      updatedUser,
    );

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(2);
    expect(
      transaction.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        email:
          'ny@example.com',
        id: {
          not: 9,
        },
      },
    });
  });

  it('rejects cross-cinema update after the target is locked and reread', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            email:
              'anna@example.com',
            firstName: 'Anna',
            lastName: 'Andersen',
            role: 'EMPLOYEE',
            cinemaId: 8,
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
        admin,
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );

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
          email:
            'ny@example.com',
          password:
            'nyt-password',
        },
      ),
    ).resolves.toEqual(
      updatedUser,
    );

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
        email:
          'ny@example.com',
        password:
          'hashed-password',
      },
    });
    expect(
      bcrypt.hash,
    ).toHaveBeenCalled();
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
