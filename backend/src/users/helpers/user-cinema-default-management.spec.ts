import {
  BadRequestException,
} from '@nestjs/common';
import { updateManagedUserDefaultCinema } from './user-cinema-membership-management';

const master = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER' as const,
  cinemaId: null,
};

function membershipUser(
  defaultCinemaId: number,
) {
  return {
    id: 9,
    firstName: 'Anna',
    lastName: 'Andersen',
    role: 'EMPLOYEE',
    cinemaId: 7,
    defaultCinemaId,
    isActive: true,
    cinemaMemberships: [
      {
        id: 1,
        cinemaId: 7,
        createdAt: new Date(
          '2026-07-24T08:00:00.000Z',
        ),
        cinema: {
          id: 7,
          name: 'Kino Grenaa',
          logoUrl: null,
        },
      },
      {
        id: 2,
        cinemaId: 8,
        createdAt: new Date(
          '2026-07-24T08:00:00.000Z',
        ),
        cinema: {
          id: 8,
          name: 'Test Biograf 1',
          logoUrl: null,
        },
      },
    ],
  };
}

describe('managed user default cinema', () => {
  it('allows MASTER to choose an active membership as default', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            membershipUser(7),
          )
          .mockResolvedValueOnce(
            membershipUser(8),
          ),
        update: jest
          .fn()
          .mockResolvedValue({ id: 9 }),
      },
      userCinemaMembership: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 2,
            cinema: {
              id: 8,
              name: 'Test Biograf 1',
            },
          }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (value: any) => unknown,
        ) => callback(transaction),
      ),
    };
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue({ id: 1 }),
    };

    await expect(
      updateManagedUserDefaultCinema(
        prisma as never,
        auditLogsService as never,
        9,
        8,
        master,
      ),
    ).resolves.toMatchObject({
      user: {
        id: 9,
        defaultCinemaId: 8,
      },
    });

    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        defaultCinemaId: 8,
      },
    });
    expect(
      auditLogsService.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        action:
          'UPDATE_USER_DEFAULT_CINEMA',
        entityId: 9,
        userId: 1,
        cinemaId: 8,
      }),
    );
  });

  it('rejects a cinema without an active membership', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            membershipUser(7),
          ),
        update: jest.fn(),
      },
      userCinemaMembership: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (value: any) => unknown,
        ) => callback(transaction),
      ),
    };

    await expect(
      updateManagedUserDefaultCinema(
        prisma as never,
        {
          create: jest.fn(),
        } as never,
        9,
        99,
        master,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      transaction.user.update,
    ).not.toHaveBeenCalled();
  });
});
