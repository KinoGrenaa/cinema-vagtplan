import { BadRequestException } from '@nestjs/common';
import { createCinema } from './cinema-create-flow';
import { updateCinemaLogo } from './cinema-logo-flow';
import { updateCinemaSettings } from './cinema-settings-flow';

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

describe('cinema write flows', () => {
  it('creates a cinema inside the global write lock', async () => {
    const created = {
      id: 7,
      name: 'Kino Nord',
    };
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      cinema: {
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
      createCinema(
        prisma as never,
        {
          name: ' Kino Nord ',
        },
      ),
    ).resolves.toEqual(created);

    expect(
      transaction.cinema.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        name: 'Kino Nord',
      },
      select: {
        id: true,
      },
    });
    expect(
      transaction.cinema.create,
    ).toHaveBeenCalledWith({
      data: {
        name: 'Kino Nord',
      },
    });
  });

  it('rejects duplicate create inside the lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      cinema: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
        create: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createCinema(
        prisma as never,
        {
          name: 'Kino Nord',
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transaction.cinema.create,
    ).not.toHaveBeenCalled();
  });

  it('updates settings and checks a changed name atomically', async () => {
    const updated = {
      id: 7,
      name: 'Kino Syd',
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
            name: 'Kino Nord',
          }),
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        update: jest
          .fn()
          .mockResolvedValue(updated),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      updateCinemaSettings(
        prisma as never,
        7,
        {
          name: ' Kino Syd ',
          aiEnabled: true,
        },
      ),
    ).resolves.toEqual(updated);

    expect(
      transaction.cinema.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
      data: {
        name: 'Kino Syd',
        aiEnabled: true,
      },
    });
  });

  it('updates only a managed local logo URL', async () => {
    const updated = {
      id: 7,
      logoUrl:
        '/uploads/cinema-logos/123-456.png',
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
        update: jest
          .fn()
          .mockResolvedValue(updated),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      updateCinemaLogo(
        prisma as never,
        7,
        '/uploads/cinema-logos/123-456.png',
      ),
    ).resolves.toEqual(updated);
  });
});
