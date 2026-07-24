import { BadRequestException } from '@nestjs/common';
import { updateManagedUserCinemaMemberships } from './user-cinema-membership-management';

const master = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER' as const,
  cinemaId: null,
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

function createMembershipUser(
  cinemaId: number | null,
  defaultCinemaId: number | null,
  memberships: Array<{
    id: number;
    cinemaId: number;
    name: string;
  }>,
) {
  return {
    id: 9,
    firstName: 'Anna',
    lastName: 'Andersen',
    role: 'EMPLOYEE',
    cinemaId,
    defaultCinemaId,
    isActive: true,
    cinemaMemberships: memberships.map(
      (membership) => ({
        id: membership.id,
        cinemaId: membership.cinemaId,
        createdAt: new Date(
          '2026-07-21T08:00:00.000Z',
        ),
        cinema: {
          id: membership.cinemaId,
          name: membership.name,
          logoUrl: null,
        },
      }),
    ),
  };
}

describe('managed user cinema memberships', () => {
  it('validates and updates memberships inside the user lock', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            createMembershipUser(7, 8, [
              {
                id: 1,
                cinemaId: 7,
                name: 'Kino Grenaa',
              },
              {
                id: 2,
                cinemaId: 8,
                name: 'Kino Syd',
              },
            ]),
          )
          .mockResolvedValueOnce(
            createMembershipUser(7, 7, [
              {
                id: 1,
                cinemaId: 7,
                name: 'Kino Grenaa',
              },
              {
                id: 3,
                cinemaId: 9,
                name: 'Kino Nord',
              },
            ]),
          ),
        update: jest
          .fn()
          .mockResolvedValue({ id: 9 }),
      },
      cinema: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 7,
            name: 'Kino Grenaa',
          },
          {
            id: 9,
            name: 'Kino Nord',
          },
        ]),
      },
      userCinemaMembership: {
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: 1 }),
        upsert: jest
          .fn()
          .mockResolvedValue({ id: 1 }),
      },
    };
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue({ id: 1 }),
    };

    await expect(
      updateManagedUserCinemaMemberships(
        createPrisma(transaction) as never,
        auditLogsService as never,
        9,
        [9, 7, 9],
        master,
      ),
    ).resolves.toMatchObject({
      user: {
        id: 9,
        cinemaId: 7,
        defaultCinemaId: 7,
      },
      memberships: [
        {
          cinemaId: 7,
          isPrimary: true,
        },
        {
          cinemaId: 9,
          isPrimary: false,
        },
      ],
    });

    expect(
      transaction.cinema.findMany,
    ).toHaveBeenCalledWith({
      where: {
        id: {
          in: [7, 9],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    expect(
      transaction.userCinemaMembership.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 9,
        isActive: true,
        cinemaId: {
          notIn: [7, 9],
        },
      },
      data: {
        isActive: false,
      },
    });
    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        cinemaId: 7,
        defaultCinemaId: 7,
      },
    });
    expect(
      auditLogsService.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        action:
          'UPDATE_USER_CINEMA_MEMBERSHIPS',
        entityId: 9,
        userId: 1,
        cinemaId: 7,
      }),
    );
  });

  it('allows removal of the previous account cinema', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            createMembershipUser(7, 7, [
              {
                id: 1,
                cinemaId: 7,
                name: 'Kino Grenaa',
              },
              {
                id: 2,
                cinemaId: 8,
                name: 'Kino Syd',
              },
            ]),
          )
          .mockResolvedValueOnce(
            createMembershipUser(8, 8, [
              {
                id: 2,
                cinemaId: 8,
                name: 'Kino Syd',
              },
            ]),
          ),
        update: jest
          .fn()
          .mockResolvedValue({ id: 9 }),
      },
      cinema: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 8,
            name: 'Kino Syd',
          },
        ]),
      },
      userCinemaMembership: {
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: 1 }),
        upsert: jest
          .fn()
          .mockResolvedValue({ id: 2 }),
      },
    };

    await expect(
      updateManagedUserCinemaMemberships(
        createPrisma(transaction) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        [8],
        master,
      ),
    ).resolves.toMatchObject({
      user: {
        cinemaId: 8,
        defaultCinemaId: 8,
      },
      memberships: [
        {
          cinemaId: 8,
          isPrimary: true,
        },
      ],
    });

    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        cinemaId: 8,
        defaultCinemaId: 8,
      },
    });
  });

  it('allows removal of every cinema membership', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            createMembershipUser(7, 7, [
              {
                id: 1,
                cinemaId: 7,
                name: 'Kino Grenaa',
              },
            ]),
          )
          .mockResolvedValueOnce(
            createMembershipUser(
              null,
              null,
              [],
            ),
          ),
        update: jest
          .fn()
          .mockResolvedValue({ id: 9 }),
      },
      cinema: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
      },
      userCinemaMembership: {
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: 1 }),
        upsert: jest.fn(),
      },
    };

    await expect(
      updateManagedUserCinemaMemberships(
        createPrisma(transaction) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        [],
        master,
      ),
    ).resolves.toMatchObject({
      user: {
        cinemaId: null,
        defaultCinemaId: null,
      },
      memberships: [],
    });

    expect(
      transaction.userCinemaMembership.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 9,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    expect(
      transaction.userCinemaMembership.upsert,
    ).not.toHaveBeenCalled();
    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        cinemaId: null,
        defaultCinemaId: null,
      },
    });
  });

  it('rejects invalid membership IDs before opening a transaction', async () => {
    const prisma = {
      $transaction: jest.fn(),
    };

    await expect(
      updateManagedUserCinemaMemberships(
        prisma as never,
        {
          create: jest.fn(),
        } as never,
        9,
        ['1e2' as unknown as number],
        master,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });
});
