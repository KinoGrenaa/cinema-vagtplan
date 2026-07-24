import {
  BadRequestException,
} from '@nestjs/common';
import {
  CinemaRole,
  EmploymentType,
} from '@prisma/client';
import { UserCinemaMembershipConfigurationService } from './user-cinema-membership-configuration.service';

const master = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER' as const,
  cinemaId: null,
};

function configuration(
  cinemaId: number,
  role: CinemaRole,
) {
  return {
    cinemaId,
    role,
    employmentType:
      EmploymentType.HOURLY,
    canManageSchedule: false,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests: false,
    canManageCinemaSettings: false,
    canSendBroadcastMessages: false,
  };
}

describe('UserCinemaMembershipConfigurationService', () => {
  it('stores different roles and permissions per cinema in one transaction', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            firstName: 'Anna',
            lastName: 'Andersen',
            role: 'EMPLOYEE',
            cinemaId: 7,
            defaultCinemaId: 7,
          }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 9 }),
      },
      cinema: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 7,
              name: 'Kino Grenaa',
            },
            {
              id: 8,
              name: 'Test Biograf 1',
            },
          ]),
      },
      userCinemaMembership: {
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: 0 }),
        upsert: jest
          .fn()
          .mockResolvedValue({ id: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (value: any) => unknown,
        ) => callback(transaction),
      ),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            firstName: 'Anna',
            lastName: 'Andersen',
            role: 'EMPLOYEE',
            cinemaId: 7,
            defaultCinemaId: 8,
            isActive: true,
            cinemaMemberships: [],
          }),
      },
    };
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue({ id: 1 }),
    };
    const service =
      new UserCinemaMembershipConfigurationService(
        prisma as never,
        auditLogsService as never,
      );

    await service.replace(
      9,
      [
        configuration(
          7,
          CinemaRole.EMPLOYEE,
        ),
        {
          ...configuration(
            8,
            CinemaRole.ADMIN,
          ),
          canManageUsers: false,
        },
      ],
      8,
      master,
    );

    expect(
      transaction.userCinemaMembership.upsert,
    ).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        update: expect.objectContaining({
          cinemaId: 7,
          role: CinemaRole.EMPLOYEE,
          canManageUsers: false,
        }),
      }),
    );
    expect(
      transaction.userCinemaMembership.upsert,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        update: expect.objectContaining({
          cinemaId: 8,
          role: CinemaRole.ADMIN,
          canManageUsers: true,
          canManagePayroll: true,
        }),
      }),
    );
    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        cinemaId: 7,
        defaultCinemaId: 8,
      },
    });
  });

  it('allows all cinema memberships to be removed', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            firstName: 'Anna',
            lastName: 'Andersen',
            role: 'EMPLOYEE',
            cinemaId: 7,
            defaultCinemaId: 7,
          }),
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
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (value: any) => unknown,
        ) => callback(transaction),
      ),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            firstName: 'Anna',
            lastName: 'Andersen',
            role: 'EMPLOYEE',
            cinemaId: null,
            defaultCinemaId: null,
            isActive: true,
            cinemaMemberships: [],
          }),
      },
    };
    const service =
      new UserCinemaMembershipConfigurationService(
        prisma as never,
        {
          create: jest.fn(),
        } as never,
      );

    await expect(
      service.replace(
        9,
        [],
        null,
        master,
      ),
    ).resolves.toBeDefined();

    expect(
      transaction.userCinemaMembership.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 9,
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedAt:
          expect.any(Date),
      },
    });
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

  it('rejects a default cinema outside the active memberships', async () => {
    const service =
      new UserCinemaMembershipConfigurationService(
        {
          $transaction: jest.fn(),
        } as never,
        {
          create: jest.fn(),
        } as never,
      );

    await expect(
      service.replace(
        9,
        [
          configuration(
            7,
            CinemaRole.EMPLOYEE,
          ),
        ],
        8,
        master,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
