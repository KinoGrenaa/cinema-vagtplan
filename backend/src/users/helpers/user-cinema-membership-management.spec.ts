import {
  BadRequestException,
} from '@nestjs/common';
import {
  updateManagedUserCinemaMemberships,
} from './user-cinema-membership-management';

const master = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER' as const,
  cinemaId: null,
};

function createPrisma(
  transaction: Record<
    string,
    any
  >,
) {
  return {
    $transaction: jest.fn(
      async (
        callback: (
          value: any,
        ) => unknown,
      ) => callback(transaction),
    ),
  };
}

function createMembershipUser(
  defaultCinemaId:
    number | null,
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
    defaultCinemaId,
    isActive: true,
    cinemaMemberships:
      memberships.map(
        (membership) => ({
          id: membership.id,
          cinemaId:
            membership.cinemaId,
          role: 'EMPLOYEE',
          employmentType:
            'HOURLY',
          canManageSchedule:
            false,
          canManageUsers:
            false,
          canManagePayroll:
            false,
          canManageLeaveRequests:
            false,
          canManageCinemaSettings:
            false,
          canSendBroadcastMessages:
            false,
          createdAt:
            new Date(
              '2026-07-21T08:00:00.000Z',
            ),
          cinema: {
            id:
              membership.cinemaId,
            name:
              membership.name,
            logoUrl: null,
          },
        }),
      ),
  };
}

describe(
  'managed user cinema memberships',
  () => {
    it('opdaterer kun medlemskaber og standardbiograf', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(
              createMembershipUser(
                8,
                [
                  {
                    id: 1,
                    cinemaId: 7,
                    name:
                      'Kino Grenaa',
                  },
                  {
                    id: 2,
                    cinemaId: 8,
                    name:
                      'Kino Syd',
                  },
                ],
              ),
            )
            .mockResolvedValueOnce(
              createMembershipUser(
                7,
                [
                  {
                    id: 1,
                    cinemaId: 7,
                    name:
                      'Kino Grenaa',
                  },
                  {
                    id: 3,
                    cinemaId: 9,
                    name:
                      'Kino Nord',
                  },
                ],
              ),
            ),
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
                id: 9,
                name:
                  'Kino Nord',
              },
            ]),
        },
        userCinemaMembership: {
          updateMany: jest
            .fn()
            .mockResolvedValue({
              count: 1,
            }),
          upsert: jest
            .fn()
            .mockResolvedValue({
              id: 1,
            }),
        },
      };

      await expect(
        updateManagedUserCinemaMemberships(
          createPrisma(
            transaction,
          ) as never,
          {
            create: jest.fn(),
          } as never,
          9,
          [9, 7, 9],
          master,
        ),
      ).resolves.toMatchObject({
        user: {
          id: 9,
          defaultCinemaId: 7,
        },
        memberships: [
          {
            cinemaId: 7,
          },
          {
            cinemaId: 9,
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
          defaultCinemaId: 7,
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

    it('bevarer en gyldig standardbiograf uden global skrivning', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(
              createMembershipUser(
                8,
                [
                  {
                    id: 1,
                    cinemaId: 7,
                    name:
                      'Kino Grenaa',
                  },
                  {
                    id: 2,
                    cinemaId: 8,
                    name:
                      'Kino Syd',
                  },
                ],
              ),
            )
            .mockResolvedValueOnce(
              createMembershipUser(
                8,
                [
                  {
                    id: 2,
                    cinemaId: 8,
                    name:
                      'Kino Syd',
                  },
                ],
              ),
            ),
          update: jest.fn(),
        },
        cinema: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                id: 8,
                name:
                  'Kino Syd',
              },
            ]),
        },
        userCinemaMembership: {
          updateMany: jest
            .fn()
            .mockResolvedValue({
              count: 1,
            }),
          upsert: jest
            .fn()
            .mockResolvedValue({
              id: 2,
            }),
        },
      };

      await updateManagedUserCinemaMemberships(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        [8],
        master,
      );

      expect(
        transaction.user.update,
      ).not.toHaveBeenCalled();
    });

    it('rydder standardbiograf ved fjernelse af alle medlemskaber', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(
              createMembershipUser(
                7,
                [
                  {
                    id: 1,
                    cinemaId: 7,
                    name:
                      'Kino Grenaa',
                  },
                ],
              ),
            )
            .mockResolvedValueOnce(
              createMembershipUser(
                null,
                [],
              ),
            ),
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

      await updateManagedUserCinemaMemberships(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        9,
        [],
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

    it('afviser ugyldige IDs før transaktionen', async () => {
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
          [
            '1e2' as unknown as number,
          ],
          master,
        ),
      ).rejects.toThrow(
        BadRequestException,
      );

      expect(
        prisma.$transaction,
      ).not.toHaveBeenCalled();
    });
  },
);
