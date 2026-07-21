import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { deactivateUserFlow } from './user-status-flow';

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

describe('user status flow', () => {
  it('checks access and deactivates inside the user lock', async () => {
    const deactivatedUser = {
      id: 9,
      firstName: 'Anna',
      lastName: 'Andersen',
      role: 'EMPLOYEE',
      cinemaId: 7,
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
    const prisma = createPrisma(transaction);
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue({
          id: 1,
        }),
    };

    await expect(
      deactivateUserFlow(
        prisma as never,
        auditLogsService as never,
        9,
        admin,
      ),
    ).resolves.toEqual(deactivatedUser);

    expect(
      transaction.user.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
    });
    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        isActive: false,
        deactivatedAt: expect.any(Date),
      },
    });
    expect(
      auditLogsService.create,
    ).toHaveBeenCalledWith({
      action: 'DEACTIVATE_USER',
      entityType: 'User',
      entityId: 9,
      description:
        'Deaktiverede bruger Anna Andersen',
      userId: 2,
      cinemaId: 7,
    });
  });

  it('rejects a cross-cinema status change before update', async () => {
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
            cinemaId: 8,
          }),
        update: jest.fn(),
      },
    };
    const auditLogsService = {
      create: jest.fn(),
    };

    await expect(
      deactivateUserFlow(
        createPrisma(
          transaction,
        ) as never,
        auditLogsService as never,
        9,
        admin,
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );

    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
    expect(
      auditLogsService.create,
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
        admin,
      ),
    ).rejects.toThrow(
      NotFoundException,
    );

    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
  });
});
