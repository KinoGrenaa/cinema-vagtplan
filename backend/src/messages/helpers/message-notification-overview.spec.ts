import {
  MESSAGE_NOTIFICATION_OVERVIEW_LIMIT,
  buildUnreadMessageNotificationWhere,
  findUnreadMessagesForNotifications,
} from './message-notification-overview';
import {
  messageInclude,
} from './message-shared';

describe(
  'message notification overview',
  () => {
    it('henter kun brugerens ulæste aktive beskeder i biografen', () => {
      expect(
        buildUnreadMessageNotificationWhere(
          9,
          7,
        ),
      ).toEqual({
        cinemaId: 7,
        isRead: false,
        archivedAt: null,
        recalledAt: null,
        OR: [
          {
            receiverId: 9,
          },
          {
            isBroadcast: true,
          },
        ],
      });
    });

    it('returnerer præcis total og højst 50 nyeste beskeder', async () => {
      const items = [
        {
          id: 81,
        },
      ];
      const prisma = {
        message: {
          findMany:
            jest.fn().mockResolvedValue(
              items,
            ),
          count:
            jest.fn().mockResolvedValue(
              73,
            ),
        },
      };

      await expect(
        findUnreadMessagesForNotifications(
          prisma as never,
          9,
          7,
        ),
      ).resolves.toEqual({
        items,
        total: 73,
        hasMore: true,
      });

      const where = {
        cinemaId: 7,
        isRead: false,
        archivedAt: null,
        recalledAt: null,
        OR: [
          {
            receiverId: 9,
          },
          {
            isBroadcast: true,
          },
        ],
      };

      expect(
        prisma.message.findMany,
      ).toHaveBeenCalledWith({
        where,
        include: messageInclude,
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        take:
          MESSAGE_NOTIFICATION_OVERVIEW_LIMIT,
      });
      expect(
        prisma.message.count,
      ).toHaveBeenCalledWith({
        where,
      });
    });
  },
);
