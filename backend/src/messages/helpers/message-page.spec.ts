import {
  buildArchivedMessagePage,
  buildArchivedMessageWhere,
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

    it('bygger adgangsfilter til sendte arkivbeskeder', () => {
      expect(
        buildArchivedMessageWhere(
          9,
          7,
          'sent',
          50,
        ),
      ).toEqual({
        cinemaId: 7,
        archivedAt: {
          not: null,
        },
        recalledAt: null,
        senderId: 9,
        id: {
          lt: 50,
        },
      });
    });

    it('udelukker egne udsendelser fra modtagne arkivbeskeder', () => {
      expect(
        buildArchivedMessageWhere(
          9,
          7,
          'received',
        ),
      ).toEqual({
        cinemaId: 7,
        archivedAt: {
          not: null,
        },
        recalledAt: null,
        senderId: {
          not: 9,
        },
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

    it('bygger arkivside med samlede fanetællere', () => {
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
