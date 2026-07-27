import {
  Prisma,
  StaffingRequestStatus,
  StaffingRequestType,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  AuthUser,
  canManageStaffing,
  resolveStaffingCinemaId,
  staffingRequestInclude,
} from './staffing-request-helpers';

export const DEFAULT_STAFFING_REQUEST_PAGE_SIZE =
  50;
export const MAX_STAFFING_REQUEST_PAGE_SIZE =
  100;

export type StaffingRequestPageOptions = {
  limit?: number;
  beforeId?: number;
  targetId?: number;
};

export type PendingStaffingRequestPageOptions = {
  limit?: number;
  page?: number;
};

export function normalizeStaffingRequestPageLimit(
  value?: number,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return DEFAULT_STAFFING_REQUEST_PAGE_SIZE;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_STAFFING_REQUEST_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_STAFFING_REQUEST_PAGE_SIZE,
  );
}

export function normalizeStaffingRequestPageNumber(
  value?: number,
) {
  if (
    value === undefined ||
    value === null ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return 1;
  }

  return value;
}

export function buildStaffingRequestVisibilityWhere(
  user: AuthUser,
  cinemaId: number,
): Prisma.StaffingRequestWhereInput {
  if (canManageStaffing(user)) {
    return {
      cinemaId,
    };
  }

  return {
    cinemaId,
    OR: [
      {
        targetUserId:
          user.sub,
      },
      {
        requestedByUserId:
          user.sub,
      },
      {
        targetUserId:
          null,
      },
    ],
  };
}

export function buildPendingStaffingRequestWhere(
  user: AuthUser,
  cinemaId: number,
): Prisma.StaffingRequestWhereInput {
  return {
    ...buildStaffingRequestVisibilityWhere(
      user,
      cinemaId,
    ),
    status:
      StaffingRequestStatus.PENDING,
  };
}

export function buildCompletedStaffingRequestWhere(
  user: AuthUser,
  cinemaId: number,
  beforeId?: number,
): Prisma.StaffingRequestWhereInput {
  return {
    ...buildStaffingRequestVisibilityWhere(
      user,
      cinemaId,
    ),
    status: {
      not:
        StaffingRequestStatus.PENDING,
    },
    ...(beforeId
      ? {
          id: {
            lt: beforeId,
          },
        }
      : {}),
  };
}

export function buildStaffingRequestTargetWhere(
  user: AuthUser,
  cinemaId: number,
  targetId: number,
): Prisma.StaffingRequestWhereInput {
  return {
    ...buildStaffingRequestVisibilityWhere(
      user,
      cinemaId,
    ),
    id: targetId,
  };
}

export const pendingStaffingRequestOrderBy:
  Prisma.StaffingRequestOrderByWithRelationInput[] =
  [
    {
      priority: 'desc',
    },
    {
      createdAt: 'desc',
    },
    {
      id: 'desc',
    },
  ];

export function buildCompletedStaffingRequestPage<
  T extends {
    id: number;
  },
>(
  rows: T[],
  limit: number,
) {
  const items =
    rows.slice(0, limit);
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

export async function findPendingStaffingRequestPage(
  prisma: PrismaService,
  user: AuthUser,
  selectedCinemaId:
    number | null | undefined,
  options:
    PendingStaffingRequestPageOptions = {},
) {
  const cinemaId =
    resolveStaffingCinemaId(
      user,
      selectedCinemaId,
    );
  const limit =
    normalizeStaffingRequestPageLimit(
      options.limit,
    );
  const page =
    normalizeStaffingRequestPageNumber(
      options.page,
    );
  const where =
    buildPendingStaffingRequestWhere(
      user,
      cinemaId,
    );
  const skip =
    (page - 1) * limit;

  const [
    items,
    totalCount,
  ] = await Promise.all([
    prisma.staffingRequest.findMany({
      where,
      include:
        staffingRequestInclude,
      orderBy:
        pendingStaffingRequestOrderBy,
      skip,
      take: limit,
    }),
    prisma.staffingRequest.count({
      where,
    }),
  ]);

  return {
    items,
    page,
    pageSize: limit,
    totalCount,
    hasMore:
      skip + items.length <
      totalCount,
  };
}

export async function findStaffingRequestPage(
  prisma: PrismaService,
  user: AuthUser,
  selectedCinemaId:
    number | null | undefined,
  options:
    StaffingRequestPageOptions = {},
) {
  const cinemaId =
    resolveStaffingCinemaId(
      user,
      selectedCinemaId,
    );
  const limit =
    normalizeStaffingRequestPageLimit(
      options.limit,
    );
  const pendingWhere =
    buildPendingStaffingRequestWhere(
      user,
      cinemaId,
    );
  const completedWhere =
    buildCompletedStaffingRequestWhere(
      user,
      cinemaId,
      options.beforeId,
    );
  const completedCountWhere =
    buildCompletedStaffingRequestWhere(
      user,
      cinemaId,
    );

  const [
    pending,
    completedRows,
    pendingCount,
    emergencyCount,
    completedCount,
    target,
  ] = await Promise.all([
    options.beforeId
      ? Promise.resolve([])
      : prisma.staffingRequest.findMany({
          where:
            pendingWhere,
          include:
            staffingRequestInclude,
          orderBy:
            pendingStaffingRequestOrderBy,
          take: limit,
        }),
    prisma.staffingRequest.findMany({
      where:
        completedWhere,
      include:
        staffingRequestInclude,
      orderBy: {
        id: 'desc',
      },
      take: limit + 1,
    }),
    prisma.staffingRequest.count({
      where:
        pendingWhere,
    }),
    prisma.staffingRequest.count({
      where: {
        ...pendingWhere,
        type:
          StaffingRequestType.EMERGENCY,
      },
    }),
    prisma.staffingRequest.count({
      where:
        completedCountWhere,
    }),
    options.targetId
      ? prisma.staffingRequest.findFirst({
          where:
            buildStaffingRequestTargetWhere(
              user,
              cinemaId,
              options.targetId,
            ),
          include:
            staffingRequestInclude,
        })
      : Promise.resolve(null),
  ]);

  return {
    pending,
    pendingPage: {
      page: 1,
      pageSize: limit,
      totalCount:
        pendingCount,
      hasMore:
        pending.length <
        pendingCount,
    },
    completed: {
      ...buildCompletedStaffingRequestPage(
        completedRows,
        limit,
      ),
      totalCount:
        completedCount,
    },
    counts: {
      emergency:
        emergencyCount,
      pending:
        pendingCount,
      completed:
        completedCount,
    },
    target,
  };
}
