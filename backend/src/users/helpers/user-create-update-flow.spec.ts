import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CinemaRole,
  EmploymentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  createUserFlow,
} from './user-create-flow';
import {
  updateOwnProfileFlow,
  updateThemeFlow,
  updateUserFlow,
} from './user-update-flow';

jest.mock('bcrypt', () => ({
  hash: jest
    .fn()
    .mockResolvedValue(
      'hashed-password',
    ),
}));

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

function membership(
  overrides:
    Record<string, any> = {},
) {
  return {
    id: 11,
    userId: 9,
    cinemaId: 7,
    role:
      CinemaRole.EMPLOYEE,
    employmentType:
      EmploymentType.HOURLY,
    hireDate: null,
    employeeNumber: null,
    payrollEmployeeId: null,
    isActive: true,
    deactivatedAt: null,
    canManageSchedule: false,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests:
      false,
    canManageCinemaSettings:
      false,
    canSendBroadcastMessages:
      false,
    ...overrides,
  };
}

describe(
  'user create and update flows',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('opretter global konto uden gamle biograffelter og medlemskab i samme transaktion', async () => {
      const createdUser = {
        id: 9,
        email:
          'anna@example.com',
        firstName: 'Anna',
        lastName: 'Andersen',
        phone: null,
        role: 'EMPLOYEE',
        defaultCinemaId: 7,
        isActive: true,
        deactivatedAt: null,
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
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              null,
            ),
          create: jest
            .fn()
            .mockResolvedValue(
              createdUser,
            ),
        },
        userCinemaMembership: {
          create: jest
            .fn()
            .mockResolvedValue(
              membership({
                employmentType:
                  EmploymentType.SALARIED,
                employeeNumber:
                  'KG-42',
                canManageSchedule:
                  true,
              }),
            ),
          findUnique: jest.fn(),
        },
      };

      await expect(
        createUserFlow(
          createPrisma(
            transaction,
          ) as never,
          {
            create: jest.fn(),
          } as never,
          {
            email:
              'anna@example.com',
            password:
              'password123',
            firstName: 'Anna',
            lastName:
              'Andersen',
            cinemaId: 7,
            employmentType:
              'SALARIED',
            employeeNumber:
              'KG-42',
            canManageSchedule:
              true,
          },
          master,
        ),
      ).resolves.toMatchObject({
        id: 9,
        role:
          CinemaRole.EMPLOYEE,
        cinemaId: 7,
        defaultCinemaId: 7,
        employmentType:
          EmploymentType.SALARIED,
        employeeNumber: 'KG-42',
      });

      expect(
        transaction.user.create,
      ).toHaveBeenCalledWith({
        data: {
          email:
            'anna@example.com',
          password:
            'hashed-password',
          firstName: 'Anna',
          lastName:
            'Andersen',
          phone: undefined,
          role: 'EMPLOYEE',
          defaultCinemaId: 7,
          isActive: true,
          deactivatedAt: null,
        },
      });

      expect(
        transaction.user.create,
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              cinemaId:
                expect.anything(),
              employmentType:
                expect.anything(),
              employeeNumber:
                expect.anything(),
              canManageSchedule:
                expect.anything(),
            }),
        }),
      );

      expect(
        transaction
          .userCinemaMembership
          .create,
      ).toHaveBeenCalledWith({
        data:
          expect.objectContaining({
            userId: 9,
            cinemaId: 7,
            employmentType:
              EmploymentType.SALARIED,
            employeeNumber:
              'KG-42',
            canManageSchedule:
              true,
          }),
      });
    });

    it('tilknytter eksisterende konto uden at ophæve global kontospærring', async () => {
      const existingUser = {
        id: 9,
        email:
          'anna@example.com',
        firstName: 'Anna',
        lastName: 'Andersen',
        phone: '12345678',
        role: 'EMPLOYEE',
        defaultCinemaId: 8,
        isActive: false,
        deactivatedAt:
          new Date(
            '2026-07-01T08:00:00.000Z',
          ),
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
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              existingUser,
            ),
          create: jest.fn(),
          update: jest.fn(),
        },
        userCinemaMembership: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              null,
            ),
          create: jest
            .fn()
            .mockResolvedValue(
              membership(),
            ),
        },
      };

      await createUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        {
          email:
            'anna@example.com',
          password:
            'new-password',
          firstName: 'Forkert',
          lastName: 'Navn',
          cinemaId: 7,
        },
        master,
      );

      expect(
        transaction.user.create,
      ).not.toHaveBeenCalled();
      expect(
        transaction.user.update,
      ).not.toHaveBeenCalled();
      expect(
        transaction
          .userCinemaMembership
          .create,
      ).toHaveBeenCalled();
    });

    it('sætter kun standardbiograf når eksisterende konto mangler den', async () => {
      const existingUser = {
        id: 9,
        email:
          'anna@example.com',
        firstName: 'Anna',
        lastName: 'Andersen',
        role: 'EMPLOYEE',
        defaultCinemaId: null,
        isActive: true,
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
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              existingUser,
            ),
          update: jest
            .fn()
            .mockResolvedValue({
              ...existingUser,
              defaultCinemaId: 7,
            }),
        },
        userCinemaMembership: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              null,
            ),
          create: jest
            .fn()
            .mockResolvedValue(
              membership(),
            ),
        },
      };

      await createUserFlow(
        createPrisma(
          transaction,
        ) as never,
        {
          create: jest.fn(),
        } as never,
        {
          email:
            'anna@example.com',
          password:
            'new-password',
          firstName: 'Anna',
          lastName:
            'Andersen',
          cinemaId: 7,
        },
        master,
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
    });

    it('afviser aktiv dublet i samme biograf', async () => {
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
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 9,
              role: 'EMPLOYEE',
            }),
        },
        userCinemaMembership: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 11,
              isActive: true,
            }),
          create: jest.fn(),
        },
      };

      await expect(
        createUserFlow(
          createPrisma(
            transaction,
          ) as never,
          {
            create: jest.fn(),
          } as never,
          {
            email:
              'anna@example.com',
            password:
              'password123',
            firstName: 'Anna',
            lastName:
              'Andersen',
            cinemaId: 7,
          },
          master,
        ),
      ).rejects.toThrow(
        'Brugeren er allerede tilknyttet denne biograf',
      );
    });

    it('kræver genaktivering af inaktivt medlemskab i samme biograf', async () => {
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
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 9,
              role: 'EMPLOYEE',
            }),
        },
        userCinemaMembership: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 11,
              isActive: false,
            }),
          create: jest.fn(),
        },
      };

      await expect(
        createUserFlow(
          createPrisma(
            transaction,
          ) as never,
          {
            create: jest.fn(),
          } as never,
          {
            email:
              'anna@example.com',
            password:
              'password123',
            firstName: 'Anna',
            lastName:
              'Andersen',
            cinemaId: 7,
          },
          master,
        ),
      ).rejects.toThrow(
        'Brugeren findes allerede i denne biograf og skal genaktiveres',
      );
    });

    it('afviser almindelige brugere på globalt update-endpoint', async () => {
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
              role: 'EMPLOYEE',
              isActive: true,
            }),
          update: jest.fn(),
        },
      };

      await expect(
        updateUserFlow(
          createPrisma(
            transaction,
          ) as never,
          {
            create: jest.fn(),
          } as never,
          9,
          {
            firstName: 'Anne',
          },
          master,
        ),
      ).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('opdaterer egen profil med låse', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 9,
            }),
          findFirst: jest
            .fn()
            .mockResolvedValue(
              null,
            ),
          update: jest
            .fn()
            .mockResolvedValue({
              id: 9,
              email:
                'ny@example.com',
            }),
        },
      };

      await updateOwnProfileFlow(
        createPrisma(
          transaction,
        ) as never,
        9,
        {
          email:
            'ny@example.com',
          password:
            'nyt-password',
        },
      );

      expect(
        bcrypt.hash,
      ).toHaveBeenCalled();
    });

    it('opdaterer tema bag brugerlåsen', async () => {
      const transaction = {
        $executeRaw: jest
          .fn()
          .mockResolvedValue(1),
        user: {
          update: jest
            .fn()
            .mockResolvedValue({
              id: 9,
              theme: 'dark',
            }),
        },
      };

      await expect(
        updateThemeFlow(
          createPrisma(
            transaction,
          ) as never,
          9,
          'dark',
        ),
      ).resolves.toMatchObject({
        theme: 'dark',
      });
    });
  },
);
