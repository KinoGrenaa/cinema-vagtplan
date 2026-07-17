import { PrismaService } from '../../prisma/prisma.service';
import {
  buildAcceptedStaffingRequestAdminFilter,
  createStaffingRequestAcceptedNotifications,
} from './staffing-request-accepted-notifications';

describe('accepted staffing request notifications', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
    },
    notification: {
      createMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds active admins through home cinema or active membership', () => {
    expect(buildAcceptedStaffingRequestAdminFilter(7)).toEqual({
      role: 'ADMIN',
      isActive: true,
      OR: [
        { cinemaId: 7 },
        {
          cinemaMemberships: {
            some: {
              cinemaId: 7,
              isActive: true,
            },
          },
        },
      ],
    });
  });

  it('creates notifications for all admins with access to the cinema', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 11 }, { id: 22 }]);
    prisma.notification.createMany.mockResolvedValue({ count: 2 });

    await createStaffingRequestAcceptedNotifications(
      prisma as unknown as PrismaService,
      7,
      31,
      'employee@example.com',
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: buildAcceptedStaffingRequestAdminFilter(7),
      select: { id: true },
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          cinemaId: 7,
          userId: 11,
          title: 'Bemandingsforespørgsel accepteret',
          message:
            'employee@example.com accepterede bemandingsforespørgsel #31',
          type: 'STAFFING_ACCEPTED',
          linkUrl: '/staffing-requests',
        },
        {
          cinemaId: 7,
          userId: 22,
          title: 'Bemandingsforespørgsel accepteret',
          message:
            'employee@example.com accepterede bemandingsforespørgsel #31',
          type: 'STAFFING_ACCEPTED',
          linkUrl: '/staffing-requests',
        },
      ],
    });
  });

  it('does not create notifications when no admin has access', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await createStaffingRequestAcceptedNotifications(
      prisma as unknown as PrismaService,
      7,
      31,
      'employee@example.com',
    );

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
