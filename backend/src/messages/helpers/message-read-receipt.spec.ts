import {
  messageParticipantSelect,
  messageSentReceiptInclude,
  presentSentMessageForUser,
} from './message-shared';

describe('message read receipts', () => {
  it('henter kun recipients der stadig er relevante for gamle læsekvitteringer', () => {
    expect(
      messageSentReceiptInclude,
    ).toEqual({
      sender: {
        select:
          messageParticipantSelect,
      },
      receiver: {
        select:
          messageParticipantSelect,
      },
      recipients: {
        where: {
          receiptExcludedAt: null,
        },
        select: {
          readAt: true,
          user: {
            select:
              messageParticipantSelect,
          },
        },
        orderBy: {
          userId: 'asc',
        },
      },
    });
  });

  it('viser individuel læsestatus og navnene på læste/ulæste modtagere', () => {
    const firstReadAt =
      new Date(
        '2026-09-07T08:00:00.000Z',
      );

    expect(
      presentSentMessageForUser({
        id: 1,
        senderId: 2,
        isRead: false,
        readAt: null,
        archivedAt: null,
        senderDeletedAt: null,
        recipients: [
          {
            readAt:
              firstReadAt,
            user: {
              id: 3,
              firstName:
                'Test 1',
              lastName:
                'tester',
            },
          },
          {
            readAt: null,
            user: {
              id: 4,
              firstName:
                'Test 2',
              lastName:
                'tester',
            },
          },
        ],
      }),
    ).toMatchObject({
      isRead: false,
      readAt: null,
      archivedAt: null,
      readReceipt: {
        totalRecipients: 2,
        readCount: 1,
        allRead: false,
        readBy: [
          {
            id: 3,
            firstName:
              'Test 1',
            lastName:
              'tester',
          },
        ],
        unreadBy: [
          {
            id: 4,
            firstName:
              'Test 2',
            lastName:
              'tester',
          },
        ],
      },
    });
  });

  it('markerer beskeden som læst af alle når alle relevante recipients har læst', () => {
    const firstReadAt =
      new Date(
        '2026-09-07T08:00:00.000Z',
      );
    const lastReadAt =
      new Date(
        '2026-09-07T08:05:00.000Z',
      );

    expect(
      presentSentMessageForUser({
        id: 1,
        senderId: 2,
        isRead: false,
        readAt: null,
        archivedAt: null,
        senderDeletedAt: null,
        recipients: [
          {
            readAt:
              firstReadAt,
            user: {
              id: 3,
              firstName: 'A',
              lastName: 'A',
            },
          },
          {
            readAt:
              lastReadAt,
            user: {
              id: 4,
              firstName: 'B',
              lastName: 'B',
            },
          },
        ],
      }),
    ).toMatchObject({
      isRead: true,
      readAt:
        lastReadAt,
      readReceipt: {
        totalRecipients: 2,
        readCount: 2,
        allRead: true,
        unreadBy: [],
      },
    });
  });

  it('har ingen relevante modtagere når alle recipients er udgået af flowet', () => {
    expect(
      presentSentMessageForUser({
        id: 1,
        senderId: 2,
        isRead: false,
        readAt: null,
        archivedAt: null,
        senderDeletedAt: null,
        recipients: [],
      }),
    ).toMatchObject({
      isRead: false,
      readAt: null,
      readReceipt: {
        totalRecipients: 0,
        readCount: 0,
        allRead: false,
        readBy: [],
        unreadBy: [],
      },
    });
  });
});
