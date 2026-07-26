import { MasterUsersService } from './master-users.service';

describe('MasterUsersService', () => {
  it('henter kun MASTER-konti med præcise felter', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 3,
            email: 'master@example.com',
            firstName: 'Anna',
            lastName: 'Master',
            phone: null,
            profileImage: null,
            address: null,
            birthDate: null,
            emergencyPhone: null,
            skills: null,
            notes: null,
            theme: 'system',
            role: 'MASTER',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            isActive: true,
            deactivatedAt: null,
            defaultCinemaId: 7,
            defaultCinema: {
              id: 7,
              name: 'Test Bio',
              logoUrl: null,
            },
          },
        ]),
      },
    };
    const service = new MasterUsersService(prisma as never);

    const result = await service.findAll();

    const query = prisma.user.findMany.mock.calls[0]?.[0];

    expect(query.where).toEqual({
      role: 'MASTER',
    });
    expect(query).not.toHaveProperty('include');
    expect(query.select).toEqual(
      expect.objectContaining({
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        defaultCinemaId: true,
        defaultCinema: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      }),
    );
    expect(query.orderBy).toEqual([
      {
        firstName: 'asc',
      },
      {
        lastName: 'asc',
      },
      {
        id: 'asc',
      },
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        id: 3,
        role: 'MASTER',
        cinemaId: 7,
        cinema: {
          id: 7,
          name: 'Test Bio',
          logoUrl: null,
        },
      }),
    ]);
  });
});
