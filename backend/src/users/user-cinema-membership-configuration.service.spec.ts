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
    canManageLeaveRequests:
      false,
    canManageCinemaSettings:
      false,
    canSendBroadcastMessages:
      false,
  };
}

function managedReadUser(
  defaultCinemaId:
    number | null,
) {
  return {
    id: 9,
    firstName: 'Anna',
    lastName: 'Andersen',
    role: 'EMPLOYEE',
    defaultCinemaId,
    isActive: true,
    cinemaMemberships: [],
  };
}

describe(
  'UserCinemaMembershipConfigurationService',
  () => {
    it('gemmer roller pr. biograf og skriver kun standardbiograf globalt', async () => {
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
              lastName:
                'Andersen',
              role: 'EMPLOYEE',
              defaultCinemaId: 7,
            }),
          update: jest
            .fn()
            .mockResolvedValue({
              id: 9,
            }),
        },
        cinema: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                id: 7,
                name:
                  'Kino Grenaa',
              },
              {
                id: 8,
                name:
                  'Test Biograf 1',
              },
            ]),
        },
        userCinemaMembership: {
          updateMany: jest
            .fn()
            .mockResolvedValue({
              count: 0,
            }),
          upsert: jest
            .fn()
            .mockResolvedValue({
              id: 1,
            }),
        },
      };
      const prisma = {
        $transaction: jest.fn(
          async (
            callback: (
              value: any,
            ) => unknown,
          ) =>
            callback(transaction),
        ),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              managedReadUser(8),
            ),
        },
      };
      const service =
        new UserCinemaMembershipConfigurationService(
          prisma as never,
          {
            create: jest.fn(),
          } as never,
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
        transaction.user.update,
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              cinemaId:
                expect.anything(),
            }),
        }),
      );
    });

    it('rydder kun standardbiograf når alle medlemskaber fjernes', async () => {
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
              lastName:
                'Andersen',
              role: 'EMPLOYEE',
              defaultCinemaId: 7,
            }),
          update: jest
            .fn()
            .mockResolvedValue({
              id: 9,
            }),
        },
        cinema: {
          findMany: jest
            .fn()
            .mockResolvedValue([]),
        },
        userCinemaMembership: {
          updateMany: jest
            .fn()
            .mockResolvedValue({
              count: 1,
            }),
          upsert: jest.fn(),
        },
      };
      const prisma = {
        $transaction: jest.fn(
          async (
            callback: (
              value: any,
            ) => unknown,
          ) =>
            callback(transaction),
        ),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              managedReadUser(
                null,
              ),
            ),
        },
      };
      const service =
        new UserCinemaMembershipConfigurationService(
          prisma as never,
          {
            create: jest.fn(),
          } as never,
        );

      await service.replace(
        9,
        [],
        null,
        master,
      );

      expect(
        transaction.user.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 9,
        },
        data: {
          defaultCinemaId: null,
        },
      });
    });

    it('afviser standard uden for aktive medlemskaber', async () => {
      const service =
        new UserCinemaMembershipConfigurationService(
          {
            $transaction:
              jest.fn(),
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
      ).rejects.toThrow(
        BadRequestException,
      );
    });
  },
);
