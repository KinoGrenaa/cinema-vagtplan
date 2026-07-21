import { BadRequestException } from '@nestjs/common';
import { createPayrollType } from './payroll-type-create-flow';
import {
  removePayrollType,
  updatePayrollType,
} from './payroll-type-mutation-flow';
import type { AuthUser } from './payroll-type-access';

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
      async (
        callback: (value: any) => unknown,
      ) => callback(transaction),
    ),
  };
}

describe('payroll type write flows', () => {
  it('creates a default payroll type atomically', async () => {
    const created = {
      id: 10,
      cinemaId: 7,
      payrollCode: 'NORMAL',
      isDefault: true,
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      payrollType: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 1,
          }),
        create: jest
          .fn()
          .mockResolvedValue(created),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createPayrollType(
        prisma as never,
        admin,
        {
          name: ' Normal tid ',
          payrollCode: ' NORMAL ',
          isDefault: true,
        },
      ),
    ).resolves.toEqual(created);

    expect(
      transaction.payrollType.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
    expect(
      transaction.payrollType.create,
    ).toHaveBeenCalledWith({
      data: {
        cinemaId: 7,
        name: 'Normal tid',
        payrollCode: 'NORMAL',
        exportCode: null,
        description: null,
        color: null,
        isDefault: true,
        isActive: true,
      },
    });
  });

  it('rejects a duplicate payroll code inside the lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      payrollType: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 10,
          }),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createPayrollType(
        prisma as never,
        admin,
        {
          name: 'Normal tid',
          payrollCode: 'NORMAL',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      transaction.payrollType.create,
    ).not.toHaveBeenCalled();
  });

  it('switches the default payroll type atomically', async () => {
    const updated = {
      id: 11,
      cinemaId: 7,
      isDefault: true,
      isActive: true,
      payrollCode: 'AFTEN',
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      payrollType: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 11,
            cinemaId: 7,
            isDefault: false,
            isActive: true,
            payrollCode: 'AFTEN',
          }),
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 1,
          }),
        update: jest
          .fn()
          .mockResolvedValue(updated),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      updatePayrollType(
        prisma as never,
        admin,
        11,
        {
          isDefault: true,
        },
      ),
    ).resolves.toEqual(updated);

    expect(
      transaction.payrollType.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        isDefault: true,
        id: {
          not: 11,
        },
      },
      data: {
        isDefault: false,
      },
    });
  });

  it('rejects deactivation of the default payroll type', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      payrollType: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 11,
            cinemaId: 7,
            isDefault: true,
            isActive: true,
            payrollCode: 'NORMAL',
          }),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      updatePayrollType(
        prisma as never,
        admin,
        11,
        {
          isActive: false,
        },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Standardlønarten skal være aktiv.',
      ),
    );

    expect(
      transaction.payrollType.update,
    ).not.toHaveBeenCalled();
  });

  it('checks usage before physical deletion', async () => {
    const deleted = {
      id: 12,
      cinemaId: 7,
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      payrollType: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 12,
            cinemaId: 7,
          }),
        delete: jest
          .fn()
          .mockResolvedValue(deleted),
      },
      workType: {
        count: jest
          .fn()
          .mockResolvedValue(0),
      },
      timeEntry: {
        count: jest
          .fn()
          .mockResolvedValue(0),
      },
      payrollAdjustment: {
        count: jest
          .fn()
          .mockResolvedValue(0),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      removePayrollType(
        prisma as never,
        admin,
        12,
      ),
    ).resolves.toEqual(deleted);

    expect(
      transaction.payrollType.delete,
    ).toHaveBeenCalledWith({
      where: {
        id: 12,
      },
    });
  });
});
