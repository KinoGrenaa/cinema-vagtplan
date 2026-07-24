import {
  BadRequestException,
} from '@nestjs/common';
import {
  CinemaRole,
  EmploymentType,
} from '@prisma/client';
import { UserCinemaProfileService } from './user-cinema-profile.service';

const admin = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN' as const,
  cinemaId: 7,
};

const master = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER' as const,
  cinemaId: null,
};

function body(
  role: CinemaRole =
    CinemaRole.EMPLOYEE,
) {
  return {
    email: 'anna@example.com',
    firstName: 'Anna',
    lastName: 'Andersen',
    phone: '12345678',
    role,
    employmentType:
      EmploymentType.HOURLY,
    canManageSchedule: true,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests: false,
    canManageCinemaSettings: false,
    canSendBroadcastMessages: false,
  };
}

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

describe('UserCinemaProfileService', () => {
  it('updates global contact data and only the active cinema membership', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            email: 'old@example.com',
            firstName: 'Anne',
            lastName: 'Andersen',
            phone: null,
            role: 'EMPLOYEE',
            defaultCinemaId: 8,
          }),
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        update: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            email: 'anna@example.com',
            firstName: 'Anna',
            lastName: 'Andersen',
            phone: '12345678',
            defaultCinemaId: 8,
          }),
      },
      userCinemaMembership: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 11,
            isActive: true,
            deactivatedAt: null,
          }),
        update: jest
          .fn()
          .mockResolvedValue({
            role: CinemaRole.EMPLOYEE,
            employmentType:
              EmploymentType.HOURLY,
            isActive: true,
            deactivatedAt: null,
            canManageSchedule: true,
            canManageUsers: false,
            canManagePayroll: false,
            canManageLeaveRequests: false,
            canManageCinemaSettings: false,
            canSendBroadcastMessages: false,
          }),
      },
    };
    const service =
      new UserCinemaProfileService(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
      );

    await expect(
      service.update(
        9,
        body(),
        admin,
      ),
    ).resolves.toMatchObject({
      id: 9,
      email: 'anna@example.com',
      cinemaId: 7,
      defaultCinemaId: 8,
      role: CinemaRole.EMPLOYEE,
      canManageSchedule: true,
    });

    expect(
      transaction.user.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
      },
      data: {
        email: 'anna@example.com',
        firstName: 'Anna',
        lastName: 'Andersen',
        phone: '12345678',
      },
      select: expect.any(Object),
    });
    expect(
      transaction.userCinemaMembership.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_cinemaId: {
            userId: 9,
            cinemaId: 7,
          },
        },
        data: expect.objectContaining({
          role: CinemaRole.EMPLOYEE,
          canManageSchedule: true,
          canManageUsers: false,
        }),
      }),
    );
  });

  it('forces all permissions for an administrator membership', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            email: 'anna@example.com',
            firstName: 'Anna',
            lastName: 'Andersen',
            phone: null,
            role: 'EMPLOYEE',
            defaultCinemaId: 7,
          }),
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
        update: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            email: 'anna@example.com',
            firstName: 'Anna',
            lastName: 'Andersen',
            phone: null,
            defaultCinemaId: 7,
          }),
      },
      userCinemaMembership: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 11,
            isActive: true,
            deactivatedAt: null,
          }),
        update: jest
          .fn()
          .mockResolvedValue({
            role: CinemaRole.ADMIN,
            employmentType:
              EmploymentType.HOURLY,
            isActive: true,
            deactivatedAt: null,
            canManageSchedule: true,
            canManageUsers: true,
            canManagePayroll: true,
            canManageLeaveRequests: true,
            canManageCinemaSettings: true,
            canSendBroadcastMessages: true,
          }),
      },
    };
    const service =
      new UserCinemaProfileService(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
      );

    await service.update(
      9,
      body(CinemaRole.ADMIN),
      admin,
    );

    expect(
      transaction.userCinemaMembership.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: CinemaRole.ADMIN,
          canManageSchedule: true,
          canManageUsers: true,
          canManagePayroll: true,
          canManageLeaveRequests: true,
          canManageCinemaSettings: true,
          canSendBroadcastMessages: true,
        }),
      }),
    );
  });

  it('requires an explicit cinema when MASTER edits an ordinary user', async () => {
    const service =
      new UserCinemaProfileService(
        {
          $transaction: jest.fn(),
        } as never,
        {
          create: jest.fn(),
        } as never,
      );

    await expect(
      service.update(
        9,
        body(),
        master,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
