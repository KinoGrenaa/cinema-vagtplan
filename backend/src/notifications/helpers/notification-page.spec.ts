import {
  buildNotificationPage,
  DEFAULT_NOTIFICATION_PAGE_SIZE,
  MAX_NOTIFICATION_PAGE_SIZE,
  normalizeNotificationPageLimit,
} from './notification-page';

describe(
  'notification pagination',
  () => {
    it('bruger standardstørrelsen uden input', () => {
      expect(
        normalizeNotificationPageLimit(),
      ).toBe(
        DEFAULT_NOTIFICATION_PAGE_SIZE,
      );
    });

    it('begrænser sidestørrelsen', () => {
      expect(
        normalizeNotificationPageLimit(
          500,
        ),
      ).toBe(
        MAX_NOTIFICATION_PAGE_SIZE,
      );
    });

    it('bygger næste cursor når der er flere rækker', () => {
      expect(
        buildNotificationPage(
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
      });
    });

    it('afslutter siden uden cursor', () => {
      expect(
        buildNotificationPage(
          [
            {
              id: 2,
            },
          ],
          50,
        ),
      ).toEqual({
        items: [
          {
            id: 2,
          },
        ],
        hasMore: false,
        nextBeforeId: null,
      });
    });
  },
);
