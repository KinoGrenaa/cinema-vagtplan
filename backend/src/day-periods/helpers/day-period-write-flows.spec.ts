import { BadRequestException } from '@nestjs/common';
import { createDayPeriod } from './day-period-create-flow';
import { reactivateDayPeriod } from './day-period-status-flow';
import type { AuthUser } from './day-period-service-helpers';

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

describe('day period write flows', () => {
  it('creates a day period inside the cinema lock transaction', async () => {
    const created = {
      id: 10,
      cinemaId: 7,
      name: 'Aften',
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      dayPeriod: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue(created),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createDayPeriod(
        prisma as never,
        admin,
        {
          name: ' Aften ',
          startMinute: '960',
          endMinute: '1380',
          sortOrder: '2',
        },
      ),
    ).resolves.toEqual(created);

    expect(
      transaction.dayPeriod.findFirst,
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
      transaction.dayPeriod.create,
    ).toHaveBeenCalledWith({
      data: {
        name: 'Aften',
        startMinute: 960,
        endMinute: 1380,
        sortOrder: 2,
        cinemaId: 7,
        isActive: true,
        archivedAt: null,
      },
    });
  });

  it('rejects a duplicate active day period inside the lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      dayPeriod: {
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
      createDayPeriod(
        prisma as never,
        admin,
        {
          name: 'Aften',
          startMinute: 960,
          endMinute: 1380,
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transaction.dayPeriod.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects a duplicate when reactivating inside the lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      dayPeriod: {
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
      reactivateDayPeriod(
        prisma as never,
        admin,
        10,
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transaction.dayPeriod.update,
    ).not.toHaveBeenCalled();
  });
});
