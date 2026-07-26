import {
  buildInboxMessageTargetWhere,
  buildInboxMessageWhere,
  buildMessagePage,
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE,
  normalizeMessagePageLimit,
} from './message-page';

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

    it('bygger adgangsfilter til indbakken', () => {
      expect(
        buildInboxMessageWhere(
          9,
          7,
          50,
        ),
      ).toEqual({
        cinemaId: 7,
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
        id: {
          lt: 50,
        },
      });
    });

    it('bygger målrettet beskedadgang', () => {
      expect(
        buildInboxMessageTargetWhere(
          9,
          7,
          31,
        ),
      ).toEqual({
        cinemaId: 7,
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
        id: 31,
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
  },
);
