import {
  BadRequestException,
} from '@nestjs/common';
import {
  LeaveStatus,
  Prisma,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  AuthUser,
  requireUserId,
} from './leave-request-service-helpers';

export const DEFAULT_LEAVE_REQUEST_PAGE_SIZE =
  50;
export const MAX_LEAVE_REQUEST_PAGE_SIZE =
  100;

export const LEAVE_REQUEST_STATUSES: LeaveStatus[] =
  [
    LeaveStatus.PENDING,
    LeaveStatus.APPROVED,
    LeaveStatus.REJECTED,
    LeaveStatus.CANCELLED,
    LeaveStatus.EXPIRED,
  ];

const COPENHAGEN_TIME_ZONE =
  'Europe/Copenhagen';
const DATE_QUERY_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const copenhagenDateTimeFormatter =
  new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        COPENHAGEN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    },
  );

export type LeaveRequestPageOptions = {
  includeAll?: boolean;
  limit?: number;
  beforeId?: number;
  targetId?: number;
  statuses?: LeaveStatus[];
  startDate?: string;
  endDate?: string;
};

const leaveRequestInclude = {
  user: true,
  createdByUser: true,
  cancelledByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  rejectedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.LeaveRequestInclude;

function getDateTimePart(
  parts:
    Intl.DateTimeFormatPart[],
  type:
    Intl.DateTimeFormatPartTypes,
) {
  const value =
    Number(
      parts.find(
        (part) =>
          part.type === type,
      )?.value,
    );

  if (
    !Number.isInteger(value)
  ) {
    throw new Error(
      `Kunne ikke beregne dansk datogrænse: ${type}`,
    );
  }

  return value;
}

function getCopenhagenOffsetMilliseconds(
  date: Date,
) {
  const parts =
    copenhagenDateTimeFormatter.formatToParts(
      date,
    );
  const formattedAsUtc =
    Date.UTC(
      getDateTimePart(
        parts,
        'year',
      ),
      getDateTimePart(
        parts,
        'month',
      ) - 1,
      getDateTimePart(
        parts,
        'day',
      ),
      getDateTimePart(
        parts,
        'hour',
      ),
      getDateTimePart(
        parts,
        'minute',
      ),
      getDateTimePart(
        parts,
        'second',
      ),
    );
  const dateWithoutMilliseconds =
    Math.floor(
      date.getTime() /
        1000,
    ) * 1000;

  return (
    formattedAsUtc -
    dateWithoutMilliseconds
  );
}

export function getCopenhagenDateStart(
  value: string,
  dayOffset = 0,
) {
  if (
    !DATE_QUERY_PATTERN.test(
      value,
    )
  ) {
    throw new BadRequestException(
      'Dato skal have formatet YYYY-MM-DD',
    );
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  const utcGuess =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + dayOffset,
        0,
        0,
        0,
      ),
    );
  let offset =
    getCopenhagenOffsetMilliseconds(
      utcGuess,
    );
  let result =
    new Date(
      utcGuess.getTime() -
        offset,
    );
  const correctedOffset =
    getCopenhagenOffsetMilliseconds(
      result,
    );

  if (
    correctedOffset !==
    offset
  ) {
    offset =
      correctedOffset;
    result =
      new Date(
        utcGuess.getTime() -
          offset,
      );
  }

  return result;
}

export function normalizeLeaveRequestPageLimit(
  value?: number,
) {
  if (
    value === undefined ||
    value === null ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_LEAVE_REQUEST_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_LEAVE_REQUEST_PAGE_SIZE,
  );
}

export function buildLeaveRequestVisibilityWhere(
  user: AuthUser,
  cinemaId: number,
  includeAll = false,
): Prisma.LeaveRequestWhereInput {
  const canViewAll =
    includeAll &&
    (user.role === 'ADMIN' ||
      user.role === 'MASTER');

  return {
    cinemaId,
    ...(canViewAll
      ? {}
      : {
          userId:
            requireUserId(user),
        }),
  };
}

export function buildLeaveRequestDateWhere(
  startDate?: string,
  endDate?: string,
): Prisma.LeaveRequestWhereInput {
  const filters:
    Prisma.LeaveRequestWhereInput[] =
    [];

  if (startDate) {
    filters.push({
      endDate: {
        gte:
          getCopenhagenDateStart(
            startDate,
          ),
      },
    });
  }

  if (endDate) {
    filters.push({
      startDate: {
        lt:
          getCopenhagenDateStart(
            endDate,
            1,
          ),
      },
    });
  }

  return filters.length > 0
    ? {
        AND: filters,
      }
    : {};
}

export function buildLeaveRequestPageWhere(
  user: AuthUser,
  cinemaId: number,
  options:
    LeaveRequestPageOptions,
): Prisma.LeaveRequestWhereInput {
  const statuses =
    options.statuses ??
    LEAVE_REQUEST_STATUSES;

  return {
    ...buildLeaveRequestVisibilityWhere(
      user,
      cinemaId,
      options.includeAll,
    ),
    ...buildLeaveRequestDateWhere(
      options.startDate,
      options.endDate,
    ),
    status: {
      in: statuses,
    },
    ...(options.beforeId
      ? {
          id: {
            lt:
              options.beforeId,
          },
        }
      : {}),
  };
}

export function buildLeaveRequestTargetWhere(
  user: AuthUser,
  cinemaId: number,
  options:
    LeaveRequestPageOptions,
): Prisma.LeaveRequestWhereInput {
  return {
    ...buildLeaveRequestVisibilityWhere(
      user,
      cinemaId,
      options.includeAll,
    ),
    id: options.targetId,
  };
}

export function buildLeaveRequestPage<
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

export async function findLeaveRequestPage(
  prisma: PrismaService,
  user: AuthUser,
  cinemaId: number,
  options:
    LeaveRequestPageOptions = {},
) {
  const limit =
    normalizeLeaveRequestPageLimit(
      options.limit,
    );
  const visibilityWhere =
    buildLeaveRequestVisibilityWhere(
      user,
      cinemaId,
      options.includeAll,
    );
  const dateWhere =
    buildLeaveRequestDateWhere(
      options.startDate,
      options.endDate,
    );
  const pageWhere =
    buildLeaveRequestPageWhere(
      user,
      cinemaId,
      options,
    );
  const filteredCountWhere =
    buildLeaveRequestPageWhere(
      user,
      cinemaId,
      {
        ...options,
        beforeId:
          undefined,
        targetId:
          undefined,
      },
    );
  const countWhere = {
    ...visibilityWhere,
    ...dateWhere,
  };

  const [
    rows,
    totalCount,
    statusGroups,
    target,
  ] =
    await Promise.all([
      prisma.leaveRequest.findMany({
        where:
          pageWhere,
        include:
          leaveRequestInclude,
        orderBy: {
          id: 'desc',
        },
        take:
          limit + 1,
      }),
      prisma.leaveRequest.count({
        where:
          filteredCountWhere,
      }),
      prisma.leaveRequest.groupBy({
        by: [
          'status',
        ],
        where:
          countWhere,
        _count: {
          _all: true,
        },
      }),
      options.targetId
        ? prisma.leaveRequest.findFirst({
            where:
              buildLeaveRequestTargetWhere(
                user,
                cinemaId,
                options,
              ),
            include:
              leaveRequestInclude,
          })
        : Promise.resolve(
            null,
          ),
    ]);

  const statusCounts =
    Object.fromEntries(
      LEAVE_REQUEST_STATUSES.map(
        (status) => [
          status,
          statusGroups.find(
            (group) =>
              group.status ===
              status,
          )?._count._all ??
            0,
        ],
      ),
    ) as Record<
      LeaveStatus,
      number
    >;

  return {
    ...buildLeaveRequestPage(
      rows,
      limit,
    ),
    totalCount,
    statusCounts,
    target,
  };
}
