import {
  countArchivedReceivedConversations,
  findArchivedReceivedConversationPageForUser,
} from './message-archive-conversation-page';

function participant(
  id: number,
  firstName: string,
) {
  return {
    id,
    firstName,
    lastName: 'Tester',
  };
}

describe(
  'message conversation archive page',
  () => {
    it('viser én modtaget arkivpost pr. samtale med hele den tilgængelige tråd', async () => {
      const archivedAt =
        new Date(
          '2026-09-07T11:24:00.000Z',
        );

      const prisma = {
        $queryRaw:
          jest.fn()
            .mockResolvedValueOnce([
              {
                conversationId:
                  'conversation-a',
                representativeId:
                  13,
                archivedAt,
              },
              {
                conversationId:
                  'conversation-b',
                representativeId:
                  7,
                archivedAt,
              },
            ])
            .mockResolvedValueOnce([
              {
                count: 2,
              },
            ]),
        message: {
          count:
            jest.fn()
              .mockResolvedValue(
                4,
              ),
          findMany:
            jest.fn()
              .mockResolvedValue([
                {
                  id: 10,
                  cinemaId: 7,
                  senderId: 9,
                  receiverId: null,
                  subject:
                    'Test besked til flere',
                  body:
                    'Oprindelig besked',
                  createdAt:
                    new Date(
                      '2026-09-07T09:35:00.000Z',
                    ),
                  isBroadcast: false,
                  isRead: false,
                  readAt: null,
                  archivedAt: null,
                  senderDeletedAt:
                    null,
                  recalledAt: null,
                  conversationId:
                    'conversation-a',
                  replyToMessageId:
                    null,
                  sender:
                    participant(
                      9,
                      'Admin',
                    ),
                  receiver: null,
                  recipients: [
                    {
                      userId: 10,
                      readAt: null,
                      deletedAt:
                        null,
                      user:
                        participant(
                          10,
                          'Test 1',
                        ),
                    },
                    {
                      userId: 11,
                      readAt: null,
                      deletedAt:
                        null,
                      user:
                        participant(
                          11,
                          'Test 2',
                        ),
                    },
                  ],
                },
                {
                  id: 12,
                  cinemaId: 7,
                  senderId: 10,
                  receiverId: 9,
                  subject:
                    'Sv: Test besked til flere',
                  body:
                    'Første svar',
                  createdAt:
                    new Date(
                      '2026-09-07T10:06:00.000Z',
                    ),
                  isBroadcast: false,
                  isRead: false,
                  readAt: null,
                  archivedAt: null,
                  senderDeletedAt:
                    null,
                  recalledAt: null,
                  conversationId:
                    'conversation-a',
                  replyToMessageId:
                    10,
                  sender:
                    participant(
                      10,
                      'Test 1',
                    ),
                  receiver:
                    participant(
                      9,
                      'Admin',
                    ),
                  recipients: [
                    {
                      userId: 9,
                      readAt:
                        new Date(),
                      deletedAt:
                        archivedAt,
                      user:
                        participant(
                          9,
                          'Admin',
                        ),
                    },
                  ],
                },
                {
                  id: 13,
                  cinemaId: 7,
                  senderId: 10,
                  receiverId: 9,
                  subject:
                    'Sv: Test besked til flere',
                  body:
                    'Nyt svar',
                  createdAt:
                    new Date(
                      '2026-09-07T10:21:00.000Z',
                    ),
                  isBroadcast: false,
                  isRead: false,
                  readAt: null,
                  archivedAt: null,
                  senderDeletedAt:
                    null,
                  recalledAt: null,
                  conversationId:
                    'conversation-a',
                  replyToMessageId:
                    12,
                  sender:
                    participant(
                      10,
                      'Test 1',
                    ),
                  receiver:
                    participant(
                      9,
                      'Admin',
                    ),
                  recipients: [
                    {
                      userId: 9,
                      readAt:
                        new Date(),
                      deletedAt:
                        archivedAt,
                      user:
                        participant(
                          9,
                          'Admin',
                        ),
                    },
                  ],
                },
              ]),
        },
      };

      await expect(
        findArchivedReceivedConversationPageForUser(
          prisma as never,
          9,
          7,
          {
            section:
              'received',
            limit: 1,
          },
        ),
      ).resolves.toMatchObject({
        items: [
          {
            id: 13,
            conversationId:
              'conversation-a',
            archivedAt,
            conversationMessageCount:
              3,
            conversationMessages: [
              {
                id: 10,
              },
              {
                id: 12,
              },
              {
                id: 13,
              },
            ],
          },
        ],
        hasMore: true,
        nextBeforeId: 13,
        counts: {
          received: 2,
          sent: 4,
        },
      });

      expect(
        prisma.message.findMany,
      ).toHaveBeenCalledTimes(
        1,
      );
      expect(
        prisma.message.count,
      ).toHaveBeenCalledTimes(
        1,
      );
    });

    it('viser eget seneste svar i arkivresuméet uden at ændre gendannelses-id', async () => {
      const archivedAt =
        new Date(
          '2026-09-07T13:24:00.000Z',
        );

      const prisma = {
        $queryRaw:
          jest.fn()
            .mockResolvedValueOnce([
              {
                conversationId:
                  'conversation-a',
                representativeId:
                  13,
                archivedAt,
              },
            ])
            .mockResolvedValueOnce([
              {
                count: 1,
              },
            ]),
        message: {
          count:
            jest.fn()
              .mockResolvedValue(
                0,
              ),
          findMany:
            jest.fn()
              .mockResolvedValue([
                {
                  id: 13,
                  cinemaId: 7,
                  senderId: 10,
                  receiverId: 9,
                  subject:
                    'Sv: Test besked til flere',
                  body:
                    'Nyt svar',
                  createdAt:
                    new Date(
                      '2026-09-07T10:21:00.000Z',
                    ),
                  isBroadcast: false,
                  isRead: false,
                  readAt: null,
                  archivedAt: null,
                  senderDeletedAt:
                    null,
                  recalledAt: null,
                  conversationId:
                    'conversation-a',
                  replyToMessageId:
                    12,
                  sender:
                    participant(
                      10,
                      'Test 1',
                    ),
                  receiver:
                    participant(
                      9,
                      'Admin',
                    ),
                  recipients: [
                    {
                      userId: 9,
                      readAt:
                        new Date(),
                      deletedAt:
                        archivedAt,
                      user:
                        participant(
                          9,
                          'Admin',
                        ),
                    },
                  ],
                },
                {
                  id: 14,
                  cinemaId: 7,
                  senderId: 9,
                  receiverId: 10,
                  subject:
                    'Sv: Test besked til flere',
                  body:
                    'Svar efter gendannelse fra arkiv',
                  createdAt:
                    new Date(
                      '2026-09-07T12:28:00.000Z',
                    ),
                  isBroadcast: false,
                  isRead: false,
                  readAt: null,
                  archivedAt: null,
                  senderDeletedAt:
                    null,
                  recalledAt: null,
                  conversationId:
                    'conversation-a',
                  replyToMessageId:
                    13,
                  sender:
                    participant(
                      9,
                      'Admin',
                    ),
                  receiver:
                    participant(
                      10,
                      'Test 1',
                    ),
                  recipients: [
                    {
                      userId: 10,
                      readAt: null,
                      deletedAt:
                        null,
                      user:
                        participant(
                          10,
                          'Test 1',
                        ),
                    },
                  ],
                },
              ]),
        },
      };

      await expect(
        findArchivedReceivedConversationPageForUser(
          prisma as never,
          9,
          7,
          {
            section:
              'received',
            limit: 50,
          },
        ),
      ).resolves.toMatchObject({
        items: [
          {
            id: 13,
            subject:
              'Sv: Test besked til flere',
            body:
              'Svar efter gendannelse fra arkiv',
            sender: {
              id: 9,
              firstName: 'Admin',
              lastName: 'Tester',
            },
            conversationMessageCount:
              2,
          },
        ],
      });
    });

    it('tæller modtagne arkiver som samtaler', async () => {
      const prisma = {
        $queryRaw:
          jest.fn()
            .mockResolvedValue([
              {
                count: 3,
              },
            ]),
      };

      await expect(
        countArchivedReceivedConversations(
          prisma as never,
          9,
          7,
          new Date(
            '2026-09-07T12:00:00.000Z',
          ),
        ),
      ).resolves.toBe(
        3,
      );
    });
  },
);
