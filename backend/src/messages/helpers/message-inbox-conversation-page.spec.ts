import {
  findInboxConversationPageForUser,
} from './message-inbox-conversation-page';

function rawMessage(
  id: number,
  conversationId: string,
  readAt: Date | null,
) {
  return {
    id,
    subject: `Emne ${id}`,
    body: `Besked ${id}`,
    createdAt:
      new Date(
        `2026-09-07T0${id % 9}:00:00.000Z`,
      ),
    cinemaId: 7,
    senderId: 12,
    receiverId: 9,
    isBroadcast: false,
    isRead: false,
    readAt: null,
    archivedAt: null,
    senderDeletedAt: null,
    recalledAt: null,
    conversationId,
    replyToMessageId: null,
    sender: {
      id: 12,
      firstName: 'Anna',
      lastName: 'Andersen',
    },
    receiver: {
      id: 9,
      firstName: 'Bo',
      lastName: 'Berg',
    },
    recipients: [
      {
        readAt,
        deletedAt: null,
      },
    ],
  };
}

describe(
  'message conversation inbox',
  () => {
    it('returnerer én repræsentant pr. samtale og paginerer på seneste aktivitet', async () => {
      const pageStates = [
        {
          conversationId:
            'conversation-a',
          representativeId: 31,
          unreadCount: 2,
          lastActivityId: 35,
          lastActivityAt:
            new Date(
              '2026-09-07T10:35:00.000Z',
            ),
          messageCount: 4,
        },
        {
          conversationId:
            'conversation-b',
          representativeId: 20,
          unreadCount: 0,
          lastActivityId: 20,
          lastActivityAt:
            new Date(
              '2026-09-07T09:20:00.000Z',
            ),
          messageCount: 1,
        },
        {
          conversationId:
            'conversation-c',
          representativeId: 10,
          unreadCount: 0,
          lastActivityId: 10,
          lastActivityAt:
            new Date(
              '2026-09-07T08:10:00.000Z',
            ),
          messageCount: 1,
        },
      ];
      const targetState = [
        {
          conversationId:
            'conversation-target',
          representativeId: 7,
          unreadCount: 1,
          lastActivityId: 9,
          lastActivityAt:
            new Date(
              '2026-09-07T07:09:00.000Z',
            ),
          messageCount: 3,
        },
      ];

      const prisma = {
        $queryRaw: jest
          .fn()
          .mockResolvedValueOnce(
            pageStates,
          )
          .mockResolvedValueOnce(
            targetState,
          ),
        message: {
          findMany:
            jest.fn()
              .mockResolvedValue([
                rawMessage(
                  31,
                  'conversation-a',
                  new Date(
                    '2026-09-07T10:00:00.000Z',
                  ),
                ),
                rawMessage(
                  20,
                  'conversation-b',
                  new Date(
                    '2026-09-07T09:00:00.000Z',
                  ),
                ),
                rawMessage(
                  7,
                  'conversation-target',
                  null,
                ),
              ]),
        },
      };

      await expect(
        findInboxConversationPageForUser(
          prisma as never,
          9,
          7,
          {
            limit: 2,
            targetId: 3,
          },
        ),
      ).resolves.toMatchObject({
        items: [
          {
            id: 31,
            conversationId:
              'conversation-a',
            isRead: false,
            conversationLastActivityId:
              35,
            conversationMessageCount:
              4,
            conversationUnreadCount:
              2,
          },
          {
            id: 20,
            conversationId:
              'conversation-b',
            isRead: true,
            conversationLastActivityId:
              20,
            conversationMessageCount:
              1,
            conversationUnreadCount:
              0,
          },
        ],
        target: {
          id: 7,
          conversationId:
            'conversation-target',
          isRead: false,
          conversationLastActivityId:
            9,
          conversationMessageCount:
            3,
          conversationUnreadCount:
            1,
        },
        hasMore: true,
        nextBeforeId: 20,
      });

      expect(
        prisma.$queryRaw,
      ).toHaveBeenCalledTimes(
        2,
      );
      expect(
        prisma.message.findMany,
      ).toHaveBeenCalledTimes(
        1,
      );
    });

    it('beholder handlings-id men viser brugerens eget seneste svar i resuméet', async () => {
      const representative =
        rawMessage(
          31,
          'conversation-a',
          new Date(
            '2026-09-07T10:00:00.000Z',
          ),
        );
      const latestOwnReply = {
        ...rawMessage(
          35,
          'conversation-a',
          null,
        ),
        subject:
          'Sv: Test besked til flere',
        body:
          'Svar efter gendannelse fra arkiv',
        senderId: 9,
        receiverId: 12,
        sender: {
          id: 9,
          firstName: 'Admin',
          lastName: 'Tester',
        },
        receiver: {
          id: 12,
          firstName: 'Test 1',
          lastName: 'Tester',
        },
        recipients: [],
      };

      const prisma = {
        $queryRaw:
          jest.fn()
            .mockResolvedValue([
              {
                conversationId:
                  'conversation-a',
                representativeId:
                  31,
                unreadCount: 0,
                lastActivityId:
                  35,
                lastActivityAt:
                  new Date(
                    '2026-09-07T12:28:00.000Z',
                  ),
                messageCount: 4,
              },
            ]),
        message: {
          findMany:
            jest.fn()
              .mockResolvedValue([
                representative,
                latestOwnReply,
              ]),
        },
      };

      await expect(
        findInboxConversationPageForUser(
          prisma as never,
          9,
          7,
        ),
      ).resolves.toMatchObject({
        items: [
          {
            id: 31,
            conversationId:
              'conversation-a',
            subject:
              'Sv: Test besked til flere',
            body:
              'Svar efter gendannelse fra arkiv',
            sender: {
              id: 9,
              firstName: 'Admin',
              lastName: 'Tester',
            },
            conversationLastActivityId:
              35,
            conversationMessageCount:
              4,
          },
        ],
      });
    });

    it('springer target-opslag over uden targetId', async () => {
      const prisma = {
        $queryRaw:
          jest.fn()
            .mockResolvedValue(
              [],
            ),
        message: {
          findMany: jest.fn(),
        },
      };

      await expect(
        findInboxConversationPageForUser(
          prisma as never,
          9,
          7,
        ),
      ).resolves.toEqual({
        items: [],
        target: null,
        hasMore: false,
        nextBeforeId: null,
      });

      expect(
        prisma.$queryRaw,
      ).toHaveBeenCalledTimes(
        1,
      );
      expect(
        prisma.message.findMany,
      ).not.toHaveBeenCalled();
    });
  },
);
