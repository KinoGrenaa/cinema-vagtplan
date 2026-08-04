import { BadRequestException } from '@nestjs/common';
import { createJobFunction } from './job-function-create-flow';
import { assignUserJobFunction } from './job-function-user-flow';
import type { AuthUser } from './job-function-service-helpers';

const admin: AuthUser = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN',
  cinemaId: 7,
  canManageSchedule: true,
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

describe('job function write flows', () => {
  it('creates a job function inside the cinema lock transaction', async () => {
    const created = {
      id: 10,
      cinemaId: 7,
      name: 'Billetsalg',
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      jobFunction: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createJobFunction(
        prisma as never,
        admin,
        {
          name: ' Billetsalg ',
        },
      ),
    ).resolves.toEqual(created);

    expect(
      transaction.jobFunction.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        nameKey: 'billetsalg',
        cinemaId: 7,
      },
      select: {
        id: true,
      },
    });
    expect(
      transaction.jobFunction.create,
    ).toHaveBeenCalled();
  });

  it('rejects a duplicate active job function inside the lock', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      jobFunction: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 10,
          }),
        create: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createJobFunction(
        prisma as never,
        admin,
        {
          name: 'Billetsalg',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      transaction.jobFunction.create,
    ).not.toHaveBeenCalled();
  });

  it('assigns a secondary member inside the lock', async () => {
    const assignment = {
      id: 30,
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      jobFunction: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 10,
            cinemaId: 7,
            isActive: true,
          }),
      },
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
          }),
      },
      userJobFunction: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue(assignment),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      assignUserJobFunction(
        prisma as never,
        admin,
        10,
        {
          userId: 9,
        },
      ),
    ).resolves.toEqual(assignment);

    expect(
      transaction.userJobFunction.create,
    ).toHaveBeenCalledWith({
      data: {
        cinemaId: 7,
        userId: 9,
        jobFunctionId: 10,
        assignedByUserId: 2,
      },
      include: expect.any(Object),
    });
  });
});
