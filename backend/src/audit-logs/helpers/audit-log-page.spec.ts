import {
  buildAuditLogPage,
  buildAuditLogPageWhere,
  MAX_AUDIT_LOG_PAGE_SIZE,
  normalizeAuditLogPageLimit,
  normalizeAuditLogSearch,
} from './audit-log-page';

describe(
  'audit-log pagination',
  () => {
    const admin = {
      sub: 9,
      role: 'ADMIN' as const,
      cinemaId: 7,
    };

    it('begrænser sidestørrelsen', () => {
      expect(
        normalizeAuditLogPageLimit(
          500,
        ),
      ).toBe(
        MAX_AUDIT_LOG_PAGE_SIZE,
      );
    });

    it('trimning og længdebegrænser søgning', () => {
      expect(
        normalizeAuditLogSearch(
          `  ${'a'.repeat(
            250,
          )}  `,
        ),
      ).toHaveLength(
        200,
      );
    });

    it('kombinerer biografadgang, type, søgning og cursor', () => {
      expect(
        buildAuditLogPageWhere(
          admin,
          undefined,
          {
            entityType:
              'USER',
            search:
              'Jesper',
            beforeId:
              50,
          },
        ),
      ).toEqual({
        AND: [
          {
            cinemaId: 7,
          },
          {
            OR:
              expect.any(
                Array,
              ),
          },
          {
            entityType:
              'USER',
          },
          {
            id: {
              lt: 50,
            },
          },
        ],
      });
    });

    it('bygger næste cursor', () => {
      expect(
        buildAuditLogPage(
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
  },
);
