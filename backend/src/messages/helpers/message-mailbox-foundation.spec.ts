import { describe, expect, it } from '@jest/globals';

import {
  buildArchivedMessageWhere,
  buildInboxMessageWhere,
  buildSentMessageWhere,
} from './message-page';
import {
  getMessageDeletionCutoff,
  isMessageDeletionExpired,
  MESSAGE_DELETION_RETENTION_DAYS,
} from './message-retention';

describe('message mailbox foundation', () => {
  it('uses recipient state for the inbox', () => {
    expect(
      buildInboxMessageWhere(
        9,
        3,
      ),
    ).toMatchObject({
      cinemaId: 3,
      recalledAt: null,
      recipients: {
        some: {
          userId: 9,
          deletedAt: null,
        },
      },
    });
  });

  it('keeps sender deletion separate from recipient deletion', () => {
    expect(
      buildSentMessageWhere(
        9,
        3,
      ),
    ).toMatchObject({
      cinemaId: 3,
      senderId: 9,
      senderDeletedAt: null,
    });

    const now =
      new Date(
        '2026-09-07T06:00:00.000Z',
      );

    expect(
      buildArchivedMessageWhere(
        9,
        3,
        'received',
        undefined,
        now,
      ),
    ).toMatchObject({
      recipients: {
        some: {
          userId: 9,
          deletedAt: {
            gt:
              getMessageDeletionCutoff(
                now,
              ),
          },
        },
      },
    });

    expect(
      buildArchivedMessageWhere(
        9,
        3,
        'sent',
        undefined,
        now,
      ),
    ).toMatchObject({
      senderId: 9,
      senderDeletedAt: {
        gt:
          getMessageDeletionCutoff(
            now,
          ),
      },
    });
  });

  it('uses a 60-day deleted-message window', () => {
    expect(
      MESSAGE_DELETION_RETENTION_DAYS,
    ).toBe(60);

    const now =
      new Date(
        '2026-09-07T06:00:00.000Z',
      );

    expect(
      isMessageDeletionExpired(
        new Date(
          '2026-07-09T06:00:00.000Z',
        ),
        now,
      ),
    ).toBe(true);

    expect(
      isMessageDeletionExpired(
        new Date(
          '2026-07-10T06:00:01.000Z',
        ),
        now,
      ),
    ).toBe(false);
  });
});
