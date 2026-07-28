import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  findAuthCinemaStartOverview,
} from './auth-cinema-start-overview';

function overviewMembership(
  cinemaId: number,
  name: string,
  options: {
    role?: 'ADMIN' | 'EMPLOYEE';
    nextShift?: {
      id: number;
      startTime: Date;
      endTime: Date;
      workType: {
        id: number;
        name: string;
        color: string;
      };
    } | null;
    canManageSchedule?: boolean;
  } = {},
) {
  return {
    cinemaId,
    role: options.role ?? 'EMPLOYEE',
    canManageSchedule:
      options.canManageSchedule ?? false,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests: false,
    canManageCinemaSettings: false,
    canSendBroadcastMessages: false,
    cinema: {
      id: cinemaId,
      name,
      logoUrl: null,
      shifts: options.nextShift
        ? [options.nextShift]
        : [],
    },
  };
}

describe('findAuthCinemaStartOverview', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    userCinemaMembership: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      userCinemaMembership: {
        findMany: jest.fn(),
      },
    };
  });

  it('returns one strictly scoped card per active membership', async () => {
    const now = new Date(
      '2026-07-27T12:00:00.000Z',
    );
    const nextShift = {
      id: 101,
      startTime: new Date(
        '2026-07-27T14:30:00.000Z',
      ),
      endTime: new Date(
        '2026-07-27T20:30:00.000Z',
      ),
      workType: {
        id: 11,
        name: 'Kiosk',
        color: '#123456',
      },
    };

    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: 'EMPLOYEE',
      defaultCinemaId: 2,
      isActive: true,
    });
    prisma.userCinemaMembership.findMany
      .mockResolvedValue([
        overviewMembership(
          1,
          'Kino Grenaa',
          {
            nextShift,
          },
        ),
        overviewMembership(
          2,
          'Kino Nord',
          {
            role: 'ADMIN',
            canManageSchedule: true,
          },
        ),
      ]);

    await expect(
      findAuthCinemaStartOverview(
        prisma as never,
        7,
        now,
      ),
    ).resolves.toEqual({
      mode: 'MULTI_CINEMA',
      activeCinemaCount: 2,
      defaultCinemaId: 2,
      cinemas: [
        {
          cinemaId: 1,
          name: 'Kino Grenaa',
          logoUrl: null,
          role: 'EMPLOYEE',
          isDefault: false,
          permissions: {
            canManageSchedule: false,
            canManageUsers: false,
            canManagePayroll: false,
            canManageLeaveRequests: false,
            canManageCinemaSettings: false,
            canSendBroadcastMessages: false,
          },
          nextShift,
        },
        {
          cinemaId: 2,
          name: 'Kino Nord',
          logoUrl: null,
          role: 'ADMIN',
          isDefault: true,
          permissions: {
            canManageSchedule: true,
            canManageUsers: false,
            canManagePayroll: false,
            canManageLeaveRequests: false,
            canManageCinemaSettings: false,
            canSendBroadcastMessages: false,
          },
          nextShift: null,
        },
      ],
    });

    expect(
      prisma.userCinemaMembership.findMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 7,
        isActive: true,
      },
      select: expect.objectContaining({
        cinemaId: true,
        role: true,
        cinema: {
          select: expect.objectContaining({
            id: true,
            name: true,
            logoUrl: true,
            shifts: {
              where: {
                userId: 7,
                endTime: {
                  gt: now,
                },
              },
              select: {
                id: true,
                startTime: true,
                endTime: true,
                workType: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
              orderBy: [
                {
                  startTime: 'asc',
                },
                {
                  id: 'asc',
                },
              ],
              take: 1,
            },
          }),
        },
      }),
      orderBy: [
        {
          cinema: {
            name: 'asc',
          },
        },
        {
          cinemaId: 'asc',
        },
      ],
    });
  });

  it('returns single-cinema mode and ignores a stale default', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: 'EMPLOYEE',
      defaultCinemaId: 99,
      isActive: true,
    });
    prisma.userCinemaMembership.findMany
      .mockResolvedValue([
        overviewMembership(
          1,
          'Kino Grenaa',
        ),
      ]);

    await expect(
      findAuthCinemaStartOverview(
        prisma as never,
        7,
      ),
    ).resolves.toMatchObject({
      mode: 'SINGLE_CINEMA',
      activeCinemaCount: 1,
      defaultCinemaId: null,
      cinemas: [
        {
          cinemaId: 1,
          isDefault: false,
        },
      ],
    });
  });

  it('keeps global MASTER on the separate MASTER flow', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: 'MASTER',
      defaultCinemaId: 2,
      isActive: true,
    });

    await expect(
      findAuthCinemaStartOverview(
        prisma as never,
        7,
      ),
    ).resolves.toEqual({
      mode: 'MASTER',
      activeCinemaCount: 0,
      defaultCinemaId: 2,
      cinemas: [],
    });

    expect(
      prisma.userCinemaMembership.findMany,
    ).not.toHaveBeenCalled();
  });

  it('rejects users without active memberships', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: 'EMPLOYEE',
      defaultCinemaId: null,
      isActive: true,
    });
    prisma.userCinemaMembership.findMany
      .mockResolvedValue([]);

    await expect(
      findAuthCinemaStartOverview(
        prisma as never,
        7,
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects missing and inactive users', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 7,
        role: 'EMPLOYEE',
        defaultCinemaId: null,
        isActive: false,
      });

    await expect(
      findAuthCinemaStartOverview(
        prisma as never,
        7,
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      findAuthCinemaStartOverview(
        prisma as never,
        7,
      ),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
