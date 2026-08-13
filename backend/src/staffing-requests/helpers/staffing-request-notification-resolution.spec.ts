import { PrismaService } from '../../prisma/prisma.service';
import {
  getStaffingRequestNotificationLinks,
  resolveStaffingRequestNotifications,
} from './staffing-request-notification-resolution';

describe(
  'staffing request notification resolution',
  () => {
    it('bygger entydige links for gyldige request IDs', () => {
      expect(
        getStaffingRequestNotificationLinks(
          [
            31,
            32,
            31,
            0,
            -1,
          ],
        ),
      ).toEqual([
        '/shift-trades?requestId=31',
        '/shift-trades?requestId=32',
        '/staffing-requests?requestId=31',
        '/staffing-requests?requestId=32',
      ]);
    });

    it('markerer alle relaterede bemandingsnotifikationer som læst og inaktive', async () => {
      const prisma = {
        notification: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                userId: 11,
              },
              {
                userId: 22,
              },
              {
                userId: 11,
              },
            ]),
          updateMany: jest
            .fn()
            .mockResolvedValue({
              count: 3,
            }),
        },
      };

      await expect(
        resolveStaffingRequestNotifications(
          prisma as unknown as PrismaService,
          7,
          [31, 32],
        ),
      ).resolves.toEqual([
        11,
        22,
      ]);

      const where = {
        cinemaId: 7,
        type:
          'STAFFING_REQUEST',
        linkUrl: {
          in: [
            '/shift-trades?requestId=31',
            '/shift-trades?requestId=32',
            '/staffing-requests?requestId=31',
            '/staffing-requests?requestId=32',
          ],
        },
      };

      expect(
        prisma.notification.findMany,
      ).toHaveBeenCalledWith({
        where,
        select: {
          userId: true,
        },
      });
      expect(
        prisma.notification.updateMany,
      ).toHaveBeenCalledWith({
        where,
        data: {
          isRead: true,
          linkUrl: null,
        },
      });
    });

    it('skriver ikke når ingen relaterede notifikationer findes', async () => {
      const prisma = {
        notification: {
          findMany: jest
            .fn()
            .mockResolvedValue([]),
          updateMany:
            jest.fn(),
        },
      };

      await expect(
        resolveStaffingRequestNotifications(
          prisma as unknown as PrismaService,
          7,
          [31],
        ),
      ).resolves.toEqual([]);

      expect(
        prisma.notification.updateMany,
      ).not.toHaveBeenCalled();
    });
  },
);
