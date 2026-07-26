import {
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getAuditLogAccessWhere,
  type CurrentUser,
} from './audit-log-access';
import {
  addSubjectUsers,
  auditLogSelect,
} from './audit-log-subject-users';

export const DEFAULT_AUDIT_LOG_PAGE_SIZE =
  50;
export const MAX_AUDIT_LOG_PAGE_SIZE =
  100;

export type AuditLogPageOptions = {
  limit?: number;
  beforeId?: number;
  search?: string;
  entityType?: string;
};

export function normalizeAuditLogPageLimit(
  value?: number,
) {
  if (
    value === undefined ||
    value === null ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_AUDIT_LOG_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_AUDIT_LOG_PAGE_SIZE,
  );
}

export function normalizeAuditLogSearch(
  value?: string,
) {
  const search =
    value?.trim() ?? '';

  return search
    ? search.slice(0, 200)
    : undefined;
}

function buildAuditLogSearchWhere(
  search?: string,
): Prisma.AuditLogWhereInput {
  const normalizedSearch =
    normalizeAuditLogSearch(
      search,
    );

  if (!normalizedSearch) {
    return {};
  }

  const numericEntityId =
    /^\d+$/.test(
      normalizedSearch,
    )
      ? Number(
          normalizedSearch,
        )
      : null;

  return {
    OR: [
      {
        action: {
          contains:
            normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        entityType: {
          contains:
            normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains:
            normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        user: {
          is: {
            OR: [
              {
                firstName: {
                  contains:
                    normalizedSearch,
                  mode:
                    'insensitive',
                },
              },
              {
                lastName: {
                  contains:
                    normalizedSearch,
                  mode:
                    'insensitive',
                },
              },
              {
                email: {
                  contains:
                    normalizedSearch,
                  mode:
                    'insensitive',
                },
              },
            ],
          },
        },
      },
      {
        cinema: {
          is: {
            name: {
              contains:
                normalizedSearch,
              mode:
                'insensitive',
            },
          },
        },
      },
      ...(numericEntityId
        ? [
            {
              entityId:
                numericEntityId,
            },
          ]
        : []),
    ],
  };
}

export function buildAuditLogPageWhere(
  currentUser: CurrentUser,
  selectedCinemaId:
    number | null | undefined,
  options:
    AuditLogPageOptions = {},
): Prisma.AuditLogWhereInput {
  const filters:
    Prisma.AuditLogWhereInput[] =
    [
      getAuditLogAccessWhere(
        currentUser,
        selectedCinemaId,
      ),
    ];
  const searchWhere =
    buildAuditLogSearchWhere(
      options.search,
    );

  if (
    Object.keys(
      searchWhere,
    ).length > 0
  ) {
    filters.push(
      searchWhere,
    );
  }

  if (
    options.entityType
  ) {
    filters.push({
      entityType:
        options.entityType,
    });
  }

  if (
    options.beforeId
  ) {
    filters.push({
      id: {
        lt:
          options.beforeId,
      },
    });
  }

  return {
    AND: filters,
  };
}

export function buildAuditLogPage<
  T extends {
    id: number;
  },
>(
  rows: T[],
  limit: number,
) {
  const items =
    rows.slice(
      0,
      limit,
    );
  const hasMore =
    rows.length > limit;

  return {
    items,
    hasMore,
    nextBeforeId:
      hasMore &&
      items.length > 0
        ? items[
            items.length - 1
          ].id
        : null,
  };
}

export async function findAuditLogPage(
  prisma: PrismaService,
  currentUser: CurrentUser,
  selectedCinemaId:
    number | null | undefined,
  options:
    AuditLogPageOptions = {},
) {
  const limit =
    normalizeAuditLogPageLimit(
      options.limit,
    );
  const pageWhere =
    buildAuditLogPageWhere(
      currentUser,
      selectedCinemaId,
      options,
    );
  const countWhere =
    buildAuditLogPageWhere(
      currentUser,
      selectedCinemaId,
      {
        search:
          options.search,
        entityType:
          options.entityType,
      },
    );
  const accessWhere =
    getAuditLogAccessWhere(
      currentUser,
      selectedCinemaId,
    );

  const [
    rows,
    totalCount,
    entityTypeGroups,
  ] = await Promise.all([
    prisma.auditLog.findMany({
      where:
        pageWhere,
      select:
        auditLogSelect,
      orderBy: {
        id: 'desc',
      },
      take:
        limit + 1,
    }),
    prisma.auditLog.count({
      where:
        countWhere,
    }),
    prisma.auditLog.groupBy({
      by: [
        'entityType',
      ],
      where:
        accessWhere,
      orderBy: {
        entityType:
          'asc',
      },
    }),
  ]);

  const page =
    buildAuditLogPage(
      rows,
      limit,
    );

  return {
    ...page,
    items:
      await addSubjectUsers(
        prisma,
        page.items,
      ),
    totalCount,
    entityTypes:
      entityTypeGroups.map(
        (group) =>
          group.entityType,
      ),
  };
}
