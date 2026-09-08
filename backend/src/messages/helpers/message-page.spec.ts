import {
  buildArchivedMessagePage,
  buildArchivedMessageWhere,
  buildInboxMessageTargetWhere,
  buildInboxMessageWhere,
  buildMessagePage,
  buildSentMessageWhere,
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE,
  normalizeMessagePageLimit,
} from './message-page';
import {
  getMessageDeletionCutoff,
} from './message-retention';

describe(
  'message pagination',
  () => {
    it('bruger standardstørrelsen uden input', () => {
      expect(
        normalizeMessagePageLimit(),
      ).toBe(
        DEFAULT_MESSAGE_PAGE_SIZE,
      );
    });

    it('begrænser sidestørrelsen', () => {
      expect(
        normalizeMessagePageLimit(
          500,
        ),
      ).toBe(
        MAX_MESSAGE_PAGE_SIZE,
      );
    });

    it('bygger adgangsfilter til indbakken via brugerens mailbox-state', () => {
      expect(
        buildInboxMessageWhere(
          9,
          7,
          50,
        ),
      ).toEqual({
        cinemaId: 7,
        recalledAt: null,
        recipients: {
          some: {
            userId: 9,
            deletedAt: null,
          },
        },
        id: {
          lt: 50,
        },
      });
    });

    it('bygger målrettet beskedadgang via brugerens mailbox-state', () => {
      expect(
        buildInboxMessageTargetWhere(
          9,
          7,
          31,
        ),
      ).toEqual({
        cinemaId: 7,
        recalledAt: null,
        recipients: {
          some: {
            userId: 9,
            deletedAt: null,
          },
        },
        id: 31,
      });
    });

    it('bygger adgangsfilter til aktive sendte beskeder', () => {
      expect(
        buildSentMessageWhere(
          9,
          7,
          50,
        ),
      ).toEqual({
        cinemaId: 7,
        senderId: 9,
        senderDeletedAt: null,
        id: {
          lt: 50,
        },
      });
    });

    it('bygger adgangsfilter til sendte slettede beskeder inden for 60 dage', () => {
      const now =
        new Date(
          '2026-09-07T06:00:00.000Z',
        );

      expect(
        buildArchivedMessageWhere(
          9,
          7,
          'sent',
          50,
          now,
        ),
      ).toEqual({
        cinemaId: 7,
        recalledAt: null,
        senderId: 9,
        senderDeletedAt: {
          gt:
            getMessageDeletionCutoff(
              now,
            ),
        },
        id: {
          lt: 50,
        },
      });
    });

    it('bygger adgangsfilter til modtagne slettede beskeder pr. bruger', () => {
      const now =
        new Date(
          '2026-09-07T06:00:00.000Z',
        );

      expect(
        buildArchivedMessageWhere(
          9,
          7,
          'received',
          undefined,
          now,
        ),
      ).toEqual({
        cinemaId: 7,
        recalledAt: null,
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
    });

    it('bygger side og bevarer en målrettet gammel besked', () => {
      expect(
        buildMessagePage(
          [
            {
              id: 12,
            },
            {
              id: 11,
            },
            {
              id: 10,
            },
          ],
          2,
          {
            id: 3,
          },
        ),
      ).toEqual({
        items: [
          {
            id: 12,
          },
          {
            id: 11,
          },
        ],
        target: {
          id: 3,
        },
        hasMore: true,
        nextBeforeId: 11,
      });
    });

    it('bygger slettet-side med samlede fanetællere', () => {
      expect(
        buildArchivedMessagePage(
          [
            {
              id: 12,
            },
            {
              id: 11,
            },
            {
              id: 10,
            },
          ],
          2,
          {
            received: 8,
            sent: 4,
          },
        ),
      ).toEqual({
        items: [
          {
            id: 12,
          },
          {
            id: 11,
          },
        ],
        hasMore: true,
        nextBeforeId: 11,
        counts: {
          received: 8,
          sent: 4,
        },
      });
    });
  },
);
