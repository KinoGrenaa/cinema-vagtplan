import { BadRequestException } from '@nestjs/common';
import { createWorkType } from './work-type-create-flow';
import { reactivateWorkType } from './work-type-status-flow';
import type { AuthUser } from './work-type-service-helpers';

const admin: AuthUser = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN',
  cinemaId: 7,
};

function createTransactionalPrisma(
  transaction: Record<string, unknown>,
) {
  return {
    $transaction: jest.fn(
      async (callback: (value: any) => unknown) =>
        callback(transaction),
    ),
  };
}

describe('work type write flows', () => {
  it('creates a work type inside the cinema lock transaction', async () => {
    const created = {
      id: 10,
      cinemaId: 7,
      name: 'Aften',
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      payrollType: {
        findFirst: jest.fn().mockResolvedValue({
          id: 4,
        }),
      },
      workType: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createWorkType(
        prisma as never,
        admin,
        {
          name: ' Aften ',
          color: '#112233',
          payrollTypeId: 4,
        },
      ),
    ).resolves.toEqual(created);

    expect(
      transaction.workType.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        name: 'Aften',
        isActive: true,
        cinemaId: 7,
      },
      select: {
        id: true,
      },
    });
    expect(
      transaction.workType.create,
    ).toHaveBeenCalled();
  });

  it('rejects a duplicate active work type inside the lock', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      payrollType: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      workType: {
        findFirst: jest.fn().mockResolvedValue({
          id: 10,
        }),
        create: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createWorkType(
        prisma as never,
        admin,
        {
          name: 'Aften',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      transaction.workType.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects a duplicate when reactivating inside the lock', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      workType: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 10,
            cinemaId: 7,
            name: 'Aften',
            isActive: false,
          })
          .mockResolvedValueOnce({
            id: 11,
          }),
        update: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      reactivateWorkType(
        prisma as never,
        admin,
        10,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      transaction.workType.update,
    ).not.toHaveBeenCalled();
  });
});
