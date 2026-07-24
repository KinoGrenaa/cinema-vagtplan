import { CinemaRole } from '@prisma/client';
import {
  getActorName,
  getLeaveManagers,
} from './leave-request-notification-actors';

describe('leave request notification actors', () => {
  it('finder ledere gennem den aktuelle biograftilknytning', async () => {
    const prisma = {
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 11,
            },
          ]),
      },
    };

    await expect(
      getLeaveManagers(
        prisma as never,
        7,
        22,
      ),
    ).resolves.toEqual([
      {
        id: 11,
      },
    ]);

    expect(
      prisma.user.findMany,
    ).toHaveBeenCalledWith({
      where: {
        isActive: true,
        role: {
          not: 'MASTER',
        },
        id: {
          not: 22,
        },
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
            OR: [
              {
                role:
                  CinemaRole.ADMIN,
              },
              {
                canManageLeaveRequests:
                  true,
              },
            ],
          },
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('bruger ikke globale ADMIN- eller fraværsrettigheder', async () => {
    const prisma = {
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
      },
    };

    await getLeaveManagers(
      prisma as never,
      7,
    );

    const call =
      prisma.user.findMany.mock.calls[0][0];

    expect(
      call.where.OR,
    ).toBeUndefined();
    expect(
      call.where
        .canManageLeaveRequests,
    ).toBeUndefined();
    expect(
      call.where
        .cinemaMemberships.some.OR,
    ).toEqual([
      {
        role: CinemaRole.ADMIN,
      },
      {
        canManageLeaveRequests: true,
      },
    ]);
  });

  it('formaterer aktørens navn', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            firstName: 'Anna',
            lastName: 'Andersen',
            email:
              'anna@example.com',
          }),
      },
    };

    await expect(
      getActorName(
        prisma as never,
        9,
      ),
    ).resolves.toBe(
      'Anna Andersen',
    );
  });
});
