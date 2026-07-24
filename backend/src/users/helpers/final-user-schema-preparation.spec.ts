import {
  buildUserUpdateData,
} from './user-service-data-helpers';
import {
  findAllUsers,
  findUserOwnProfile,
} from './user-read-flow';

describe(
  'final user schema preparation',
  () => {
    it('skriver kun globale MASTER-kontofelter', () => {
      expect(
        buildUserUpdateData({
          email:
            'master@example.com',
          firstName: 'System',
          lastName: 'Master',
          role: 'MASTER',
          // Bevidst runtime-input fra en gammel klient.
          ...({
            cinemaId: 7,
            hireDate:
              '2026-01-01',
            employmentType:
              'SALARIED',
            canManagePayroll:
              true,
          } as any),
        }),
      ).toEqual({
        email:
          'master@example.com',
        firstName: 'System',
        lastName: 'Master',
        role: 'MASTER',
      });
    });

    it('returnerer defaultCinemaId som midlertidigt profil-alias', async () => {
      const prisma = {
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
              profileImage: null,
              address: null,
              birthDate: null,
              emergencyPhone: null,
              skills: null,
            }),
        },
      };

      await expect(
        findUserOwnProfile(
          prisma as never,
          9,
        ),
      ).resolves.toMatchObject({
        id: 9,
        cinemaId: 8,
        defaultCinemaId: 8,
      });
    });

    it('viser medlemskabets data uden global cinema-relation', async () => {
      const prisma = {
        user: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                id: 9,
                email:
                  'anna@example.com',
                firstName: 'Anna',
                lastName:
                  'Andersen',
                phone: null,
                profileImage: null,
                address: null,
                birthDate: null,
                emergencyPhone: null,
                skills: null,
                notes: null,
                theme: 'light',
                createdAt:
                  new Date(),
                defaultCinemaId: 8,
                isActive: true,
                deactivatedAt: null,
                cinemaMemberships: [
                  {
                    role:
                      'EMPLOYEE',
                    employmentType:
                      'HOURLY',
                    hireDate: null,
                    employeeNumber:
                      'KG-42',
                    payrollEmployeeId:
                      'LON-42',
                    isActive: true,
                    deactivatedAt:
                      null,
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
                    cinema: {
                      id: 7,
                      name:
                        'Kino Grenaa',
                      logoUrl: null,
                    },
                  },
                ],
              },
            ]),
        },
      };

      await expect(
        findAllUsers(
          prisma as never,
          {
            sub: 2,
            email:
              'admin@example.com',
            role: 'ADMIN',
            cinemaId: 7,
          },
        ),
      ).resolves.toEqual([
        expect.objectContaining({
          id: 9,
          cinemaId: 7,
          cinema: {
            id: 7,
            name:
              'Kino Grenaa',
            logoUrl: null,
          },
          role: 'EMPLOYEE',
          employeeNumber:
            'KG-42',
          payrollEmployeeId:
            'LON-42',
        }),
      ]);

      expect(
        prisma.user.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          select:
            expect.objectContaining({
              cinemaMemberships:
                expect.any(Object),
            }),
        }),
      );
    });
  },
);
