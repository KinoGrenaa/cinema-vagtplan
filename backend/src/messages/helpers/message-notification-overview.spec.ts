import {
  MESSAGE_NOTIFICATION_OVERVIEW_LIMIT,
  buildUnreadMessageNotificationWhere,
  findUnreadMessagesForNotifications,
} from './message-notification-overview';
import {
  messageMailboxInclude,
} from './message-shared';

describe(
  'message notification overview',
  () => {
    it('henter kun brugerens ulæste aktive mailbox-kopier i biografen', () => {
      expect(
        buildUnreadMessageNotificationWhere(
          9,
          7,
        ),
      ).toEqual({
        cinemaId: 7,
        recalledAt: null,
        recipients: {
          some: {
            userId: 9,
            readAt: null,
            deletedAt: null,
          },
        },
      });
    });

    it('returnerer præcis total og højst 50 nyeste beskeder', async () => {
      const rawItems = [
        {
          id: 81,
          senderId: 12,
          isRead: false,
          readAt: null,
          archivedAt: null,
          senderDeletedAt: null,
          recipients: [
            {
              readAt: null,
              deletedAt: null,
            },
          ],
        },
      ];
      const prisma = {
        message: {
          findMany:
            jest.fn().mockResolvedValue(
              rawItems,
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
        items: [
          {
            id: 81,
            senderId: 12,
            isRead: false,
            readAt: null,
            archivedAt: null,
          },
        ],
        total: 73,
        hasMore: true,
      });

      const where = {
        cinemaId: 7,
        recalledAt: null,
        recipients: {
          some: {
            userId: 9,
            readAt: null,
            deletedAt: null,
          },
        },
      };

      expect(
        prisma.message.findMany,
      ).toHaveBeenCalledWith({
        where,
        include:
          messageMailboxInclude(
            9,
          ),
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
