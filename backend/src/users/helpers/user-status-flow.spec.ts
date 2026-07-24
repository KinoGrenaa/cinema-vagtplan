import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  deactivateUserFlow,
  reactivateUserFlow,
} from './user-status-flow';

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

describe('global user status flow', () => {
  it('allows MASTER to globally deactivate another MASTER', async () => {
    const deactivatedUser = {
      id: 9,
      firstName: 'System',
      lastName: 'Master',
      role: 'MASTER',
      cinemaId: null,
      isActive: false,
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            ...deactivatedUser,
            isActive: true,
          }),
        update: jest
          .fn()
          .mockResolvedValue(
            deactivatedUser,
          ),
      },
    };

    await expect(
      deactivateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        master,
      ),
    ).resolves.toEqual(deactivatedUser);

    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        isActive: false,
        deactivatedAt:
          expect.any(Date),
      },
    });
  });

  it('allows MASTER to globally reactivate another MASTER', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            firstName: 'System',
            lastName: 'Master',
            role: 'MASTER',
            cinemaId: null,
            isActive: false,
          }),
        update: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            firstName: 'System',
            lastName: 'Master',
            role: 'MASTER',
            cinemaId: null,
            isActive: true,
          }),
      },
    };

    await expect(
      reactivateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        master,
      ),
    ).resolves.toMatchObject({
      id: 9,
      isActive: true,
    });
  });

  it('rejects global status changes for ordinary users', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            firstName: 'Anna',
            lastName: 'Andersen',
            role: 'EMPLOYEE',
            cinemaId: 7,
          }),
        update: jest.fn(),
      },
    };

    await expect(
      deactivateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        master,
      ),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      deactivateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        admin,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
  });

  it('rejects a missing target inside the lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(null),
        update: jest.fn(),
      },
    };

    await expect(
      deactivateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        master,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
