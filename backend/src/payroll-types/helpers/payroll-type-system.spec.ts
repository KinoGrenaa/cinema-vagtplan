import { BadRequestException } from '@nestjs/common';

import { createPayrollType } from './payroll-type-create-flow';
import {
  removePayrollType,
  updatePayrollType,
} from './payroll-type-mutation-flow';
import {
  ensureManualEntryPayrollType,
  MANUAL_ENTRY_PAYROLL_CODE,
  MANUAL_ENTRY_PAYROLL_DESCRIPTION,
  MANUAL_ENTRY_PAYROLL_NAME,
} from './payroll-type-system';
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

describe('manual entry system payroll type', () => {
  it('creates the fixed system payroll type and leaves exportCode configurable', async () => {
    const created = {
      id: 30,
      cinemaId: 7,
      name: MANUAL_ENTRY_PAYROLL_NAME,
      payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
      exportCode: null,
      description: MANUAL_ENTRY_PAYROLL_DESCRIPTION,
      color: '#64748b',
      isDefault: false,
      isActive: true,
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      payrollType: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const prisma = createTransactionalPrisma(transaction);

    await expect(
      ensureManualEntryPayrollType(
        prisma as never,
        7,
      ),
    ).resolves.toEqual(created);

    expect(
      transaction.payrollType.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cinemaId: 7,
        name: MANUAL_ENTRY_PAYROLL_NAME,
        payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
        exportCode: null,
        isDefault: false,
        isActive: true,
      }),
    });
  });

  it('rejects user creation of the reserved MANUAL_ENTRY code', async () => {
    await expect(
      createPayrollType(
        {} as never,
        admin,
        {
          name: 'Forkert',
          payrollCode: 'manual_entry',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows only exportCode updates on the system type', async () => {
    const existing = {
      id: 30,
      cinemaId: 7,
      name: MANUAL_ENTRY_PAYROLL_NAME,
      payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
      exportCode: null,
      description: MANUAL_ENTRY_PAYROLL_DESCRIPTION,
      color: '#64748b',
      isDefault: false,
      isActive: true,
    };
    const updated = {
      ...existing,
      exportCode: '901',
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      payrollType: {
        findFirst: jest.fn().mockResolvedValue(existing),
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const prisma = createTransactionalPrisma(transaction);

    await expect(
      updatePayrollType(
        prisma as never,
        admin,
        30,
        {
          exportCode: '901',
        },
      ),
    ).resolves.toEqual(updated);

    expect(
      transaction.payrollType.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 30,
      },
      data: {
        exportCode: '901',
      },
    });

    await expect(
      updatePayrollType(
        prisma as never,
        admin,
        30,
        {
          isActive: false,
        },
      ),
    ).rejects.toThrow(
      'Systemløntypen Manuel registrering kan kun få ændret sin eksportkode.',
    );
  });

  it('cannot delete the system payroll type', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      payrollType: {
        findFirst: jest.fn().mockResolvedValue({
          id: 30,
          cinemaId: 7,
          payrollCode: MANUAL_ENTRY_PAYROLL_CODE,
        }),
        delete: jest.fn(),
      },
      jobFunction: {
        count: jest.fn(),
      },
      timeEntry: {
        count: jest.fn(),
      },
      payrollAdjustment: {
        count: jest.fn(),
      },
    };
    const prisma = createTransactionalPrisma(transaction);

    await expect(
      removePayrollType(
        prisma as never,
        admin,
        30,
      ),
    ).rejects.toThrow(
      'Systemløntypen Manuel registrering kan ikke slettes.',
    );

    expect(
      transaction.payrollType.delete,
    ).not.toHaveBeenCalled();
  });
});
