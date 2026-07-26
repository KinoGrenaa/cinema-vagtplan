import {
  USER_LIST_PAGE_SIZE,
  findCinemaUsersPage,
} from './user-list-query';

describe('paginated cinema user read', () => {
  function createPrismaMock() {
    return {
      cinema: {
        findUnique: jest.fn().mockResolvedValue({
          id: 3,
        }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 8,
            email: 'anna@example.com',
            firstName: 'Anna',
            lastName: 'Jensen',
            phone: null,
            profileImage: null,
            address: null,
            birthDate: null,
            emergencyPhone: null,
            skills: null,
            notes: null,
            theme: 'system',
            createdAt: new Date(
              '2026-07-01T00:00:00.000Z',
            ),
            defaultCinemaId: 3,
            isActive: true,
            deactivatedAt: null,
            cinemaMemberships: [
              {
                role: 'EMPLOYEE',
                employmentType: 'HOURLY',
                hireDate: null,
                employeeNumber: '42',
                payrollEmployeeId: null,
                isActive: true,
                deactivatedAt: null,
                canManageSchedule: false,
                canManageUsers: false,
                canManagePayroll: false,
                canManageLeaveRequests: false,
                canManageCinemaSettings: false,
                canSendBroadcastMessages: false,
                cinema: {
                  id: 3,
                  name: 'Test Bio',
                  logoUrl: null,
                },
              },
            ],
          },
        ]),
        count: jest.fn().mockResolvedValue(73),
      },
    };
  }

  it('afgrænser, søger, sorterer og paginerer server-side', async () => {
    const prisma = createPrismaMock();

    const result = await findCinemaUsersPage(
      prisma as never,
      {
        sub: 4,
        email: 'admin@example.com',
        role: 'ADMIN',
        cinemaId: 3,
      },
      {
        page: 2,
        search: 'Anna 42',
        includeInactive: false,
        sort: 'NEWEST',
      },
    );

    const query =
      prisma.user.findMany.mock.calls[0]?.[0];

    expect(query.where).toEqual(
      expect.objectContaining({
        AND: expect.arrayContaining([
          {
            role: {
              not: 'MASTER',
            },
            isActive: true,
            cinemaMemberships: {
              some: {
                cinemaId: 3,
                isActive: true,
              },
            },
          },
        ]),
      }),
    );
    expect(query.orderBy).toEqual([
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ]);
    expect(query.skip).toBe(
      USER_LIST_PAGE_SIZE,
    );
    expect(query.take).toBe(
      USER_LIST_PAGE_SIZE,
    );
    expect(result).toEqual(
      expect.objectContaining({
        page: 2,
        pageSize: USER_LIST_PAGE_SIZE,
        total: 73,
        hasMore: true,
      }),
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 8,
        cinemaId: 3,
        role: 'EMPLOYEE',
        employeeNumber: '42',
        isActive: true,
        canManageAccount: true,
      }),
    );
  });

  it('kræver en valgt biograf for global MASTER', async () => {
    const prisma = createPrismaMock();

    await expect(
      findCinemaUsersPage(
        prisma as never,
        {
          sub: 1,
          email: 'master@example.com',
          role: 'MASTER',
          cinemaId: null,
        },
        {
          page: 1,
          search: '',
          includeInactive: false,
          sort: 'NAME',
        },
      ),
    ).rejects.toThrow(
      'Vælg en biograf, før brugerne hentes',
    );
  });
});
