import {
  BadRequestException,
} from '@nestjs/common';
import { UserCinemaMembershipStatusService } from './user-cinema-membership-status.service';

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

function membership(
  isActive: boolean,
) {
  return {
    role: 'EMPLOYEE',
    employmentType: 'HOURLY',
    isActive,
    deactivatedAt: isActive
      ? null
      : new Date(
          '2026-07-20T08:00:00.000Z',
        ),
    canManageSchedule: false,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests: false,
    canManageCinemaSettings: false,
    canSendBroadcastMessages: false,
  };
}

function createPrisma(
  transaction: Record<
    string,
    unknown
  >,
) {
  return {
    $transaction: jest.fn(
      async (
        callback: (
          value: typeof transaction,
        ) => unknown,
      ) => callback(transaction),
    ),
  };
}

describe(
  'UserCinemaMembershipStatusService',
  () => {
    it('deaktiverer kun tilknytningen i den aktive biograf', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 9,
              email:
                'anna@example.com',
              firstName: 'Anna',
              lastName:
                'Andersen',
              phone: null,
              role: 'EMPLOYEE',
              defaultCinemaId: 7,
            }),
          update: jest
            .fn()
            .mockResolvedValue({
              id: 9,
            }),
        },
        userCinemaMembership: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              membership(true),
            ),
          update: jest
            .fn()
            .mockResolvedValue(
              membership(false),
            ),
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                cinemaId: 8,
              },
            ]),
        },
      };
      const auditLogsService = {
        create: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
      };
      const service =
        new UserCinemaMembershipStatusService(
          createPrisma(
            transaction,
          ) as never,
          auditLogsService as never,
        );

      await expect(
        service.deactivate(
          9,
          admin,
        ),
      ).resolves.toMatchObject({
        id: 9,
        cinemaId: 7,
        defaultCinemaId: 8,
        isActive: false,
      });

      expect(
        transaction
          .userCinemaMembership
          .update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_cinemaId: {
              userId: 9,
              cinemaId: 7,
            },
          },
          data: {
            isActive: false,
            deactivatedAt:
              expect.any(Date),
          },
        }),
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

    it('genaktiverer kun den valgte biograftilknytning', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 9,
              email:
                'anna@example.com',
              firstName: 'Anna',
              lastName:
                'Andersen',
              phone: null,
              role: 'EMPLOYEE',
              defaultCinemaId: null,
            }),
          update: jest
            .fn()
            .mockResolvedValue({
              id: 9,
            }),
        },
        userCinemaMembership: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              membership(false),
            ),
          update: jest
            .fn()
            .mockResolvedValue(
              membership(true),
            ),
        },
      };
      const service =
        new UserCinemaMembershipStatusService(
          createPrisma(
            transaction,
          ) as never,
          {
            create: jest.fn(),
          } as never,
        );

      await expect(
        service.reactivate(
          9,
          admin,
        ),
      ).resolves.toMatchObject({
        cinemaId: 7,
        defaultCinemaId: 7,
        isActive: true,
      });

      expect(
        transaction
          .userCinemaMembership
          .update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            isActive: true,
            deactivatedAt: null,
          },
        }),
      );
      expect(
        transaction.user.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 9,
        },
        data: {
          defaultCinemaId: 7,
        },
      });
      expect(
        transaction.user.update,
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              isActive:
                expect.anything(),
            }),
        }),
      );
      expect(
        transaction.user.update,
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              deactivatedAt:
                expect.anything(),
            }),
        }),
      );
    });

    it('bevarer eksisterende standardbiograf ved genaktivering', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 9,
              email:
                'anna@example.com',
              firstName: 'Anna',
              lastName:
                'Andersen',
              phone: null,
              role: 'EMPLOYEE',
              defaultCinemaId: 8,
            }),
          update: jest.fn(),
        },
        userCinemaMembership: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              membership(false),
            ),
          update: jest
            .fn()
            .mockResolvedValue(
              membership(true),
            ),
        },
      };
      const service =
        new UserCinemaMembershipStatusService(
          createPrisma(
            transaction,
          ) as never,
          {
            create: jest.fn(),
          } as never,
        );

      await service.reactivate(
        9,
        admin,
      );

      expect(
        transaction.user.update,
      ).not.toHaveBeenCalled();
    });

    it('kræver valgt biograf for MASTER', async () => {
      const service =
        new UserCinemaMembershipStatusService(
          {
            $transaction:
              jest.fn(),
          } as never,
          {
            create: jest.fn(),
          } as never,
        );

      await expect(
        service.deactivate(
          9,
          master,
        ),
      ).rejects.toThrow(
        BadRequestException,
      );
    });
  },
);
