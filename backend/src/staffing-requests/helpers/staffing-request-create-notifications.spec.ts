import { PrismaService } from '../../prisma/prisma.service';
import { createNotificationForStaffingRequest } from './staffing-request-create-notifications';

describe('staffing request create notifications', () => {
  it('sender en fælles forespørgsel kun til kvalificerede aktive medarbejdere', async () => {
    const prisma = {
      staffingRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 31,
          cinemaId: 7,
          targetUserId: null,
          jobFunctionId: 51,
          message: 'Kan du tage vagten?',
          targetUser: null,
          requestedByUser: {
            id: 2,
          },
        }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 21,
          },
        ]),
      },
      notification: {
        createMany: jest.fn().mockResolvedValue({
          count: 1,
        }),
      },
    } as unknown as PrismaService;

    await createNotificationForStaffingRequest(
      prisma,
      31,
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        role: {
          not: 'MASTER',
        },
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
          },
        },
        userJobFunctions: {
          some: {
            cinemaId: 7,
            jobFunctionId: 51,
          },
        },
      },
      select: {
        id: true,
      },
    });

    expect(
      prisma.notification.createMany,
    ).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          cinemaId: 7,
          userId: 21,
          type: 'STAFFING_REQUEST',
          linkUrl:
            '/shift-trades?requestId=31',
        }),
      ],
    });
  });
});
