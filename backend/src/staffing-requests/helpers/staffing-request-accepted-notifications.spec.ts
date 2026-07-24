import {
  CinemaRole,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  buildAcceptedStaffingRequestAdminFilter,
  createStaffingRequestAcceptedNotifications,
} from './staffing-request-accepted-notifications';

describe(
  'accepted staffing request notifications',
  () => {
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

    it('finder aktive administratorer gennem medlemskabets rolle', () => {
      expect(
        buildAcceptedStaffingRequestAdminFilter(
          7,
        ),
      ).toEqual({
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
            role:
              CinemaRole.ADMIN,
          },
        },
      });
    });

    it('opretter notifikationer til alle administratorer i biografen', async () => {
      prisma.user.findMany
        .mockResolvedValue([
          {
            id: 11,
          },
          {
            id: 22,
          },
        ]);
      prisma.notification.createMany
        .mockResolvedValue({
          count: 2,
        });

      await createStaffingRequestAcceptedNotifications(
        prisma as unknown as PrismaService,
        7,
        31,
        'employee@example.com',
      );

      expect(
        prisma.user.findMany,
      ).toHaveBeenCalledWith({
        where:
          buildAcceptedStaffingRequestAdminFilter(
            7,
          ),
        select: {
          id: true,
        },
      });
      expect(
        prisma.notification.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            cinemaId: 7,
            userId: 11,
            title:
              'Bemandingsforespørgsel accepteret',
            message:
              'employee@example.com accepterede bemandingsforespørgsel #31',
            type:
              'STAFFING_ACCEPTED',
            linkUrl:
              '/staffing-requests?requestId=31',
          },
          {
            cinemaId: 7,
            userId: 22,
            title:
              'Bemandingsforespørgsel accepteret',
            message:
              'employee@example.com accepterede bemandingsforespørgsel #31',
            type:
              'STAFFING_ACCEPTED',
            linkUrl:
              '/staffing-requests?requestId=31',
          },
        ],
      });
    });

    it('opretter ikke notifikationer når ingen administrator har adgang', async () => {
      prisma.user.findMany
        .mockResolvedValue([]);

      await createStaffingRequestAcceptedNotifications(
        prisma as unknown as PrismaService,
        7,
        31,
        'employee@example.com',
      );

      expect(
        prisma.notification.createMany,
      ).not.toHaveBeenCalled();
    });
  },
);
