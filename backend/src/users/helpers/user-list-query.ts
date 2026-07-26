import {
  ForbiddenException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { ensureCinemaExists } from './user-service-data-helpers';
import type { AuthUser } from './user-service-helpers';

export const USER_LIST_PAGE_SIZE = 50;

export type UserListSort =
  | 'NAME'
  | 'NEWEST'
  | 'OLDEST';

export type UserListOptions = {
  cinemaId?: number;
  page: number;
  search: string;
  includeInactive: boolean;
  sort: UserListSort;
};

function getUserListOrderBy(
  sort: UserListSort,
): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case 'NEWEST':
      return [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ];
    case 'OLDEST':
      return [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ];
    case 'NAME':
      return [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          id: 'asc',
        },
      ];
  }
}

async function resolveUserListCinemaId(
  prisma: PrismaService,
  currentUser: AuthUser,
  selectedCinemaId?: number,
) {
  if (currentUser.role === 'MASTER') {
    const cinemaId =
      selectedCinemaId ?? currentUser.cinemaId;

    if (!cinemaId) {
      throw new ForbiddenException(
        'Vælg en biograf, før brugerne hentes',
      );
    }

    await ensureCinemaExists(prisma, cinemaId);
    return cinemaId;
  }

  if (!currentUser.cinemaId) {
    throw new ForbiddenException(
      'Din bruger er ikke tilknyttet en biograf',
    );
  }

  return currentUser.cinemaId;
}

function getSearchClauses(
  search: string,
  cinemaId: number,
): Prisma.UserWhereInput[] {
  const terms = search
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 10);

  return terms.map((term) => ({
    OR: [
      {
        firstName: {
          contains: term,
          mode: 'insensitive',
        },
      },
      {
        lastName: {
          contains: term,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: term,
          mode: 'insensitive',
        },
      },
      {
        phone: {
          contains: term,
          mode: 'insensitive',
        },
      },
      {
        cinemaMemberships: {
          some: {
            cinemaId,
            OR: [
              {
                employeeNumber: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
              {
                payrollEmployeeId: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      },
    ],
  }));
}

export async function findCinemaUsersPage(
  prisma: PrismaService,
  currentUser: AuthUser,
  options: UserListOptions,
) {
  const cinemaId = await resolveUserListCinemaId(
    prisma,
    currentUser,
    options.cinemaId,
  );
  const membershipWhere = {
    cinemaId,
    ...(options.includeInactive
      ? {}
      : {
          isActive: true,
        }),
  };
  const baseWhere: Prisma.UserWhereInput = {
    role: {
      not: 'MASTER',
    },
    ...(options.includeInactive
      ? {}
      : {
          isActive: true,
        }),
    cinemaMemberships: {
      some: membershipWhere,
    },
  };
  const searchClauses = getSearchClauses(
    options.search,
    cinemaId,
  );
  const where: Prisma.UserWhereInput =
    searchClauses.length > 0
      ? {
          AND: [
            baseWhere,
            ...searchClauses,
          ],
        }
      : baseWhere;
  const skip =
    (options.page - 1) * USER_LIST_PAGE_SIZE;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        address: true,
        birthDate: true,
        emergencyPhone: true,
        skills: true,
        notes: true,
        theme: true,
        createdAt: true,
        defaultCinemaId: true,
        isActive: true,
        deactivatedAt: true,
        cinemaMemberships: {
          where: {
            cinemaId,
          },
          select: {
            role: true,
            employmentType: true,
            hireDate: true,
            employeeNumber: true,
            payrollEmployeeId: true,
            isActive: true,
            deactivatedAt: true,
            canManageSchedule: true,
            canManageUsers: true,
            canManagePayroll: true,
            canManageLeaveRequests: true,
            canManageCinemaSettings: true,
            canSendBroadcastMessages: true,
            cinema: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: getUserListOrderBy(options.sort),
      skip,
      take: USER_LIST_PAGE_SIZE,
    }),
    prisma.user.count({
      where,
    }),
  ]);

  const items = users.flatMap((user) => {
    const membership = user.cinemaMemberships[0];

    if (!membership) {
      return [];
    }

    const {
      cinemaMemberships: _memberships,
      ...account
    } = user;
    const accountIsActive = account.isActive;
    const membershipIsActive = membership.isActive;

    return [
      {
        ...account,
        cinemaId,
        cinema: membership.cinema,
        role: membership.role,
        employmentType:
          membership.employmentType,
        hireDate: membership.hireDate,
        employeeNumber:
          membership.employeeNumber,
        payrollEmployeeId:
          membership.payrollEmployeeId,
        isActive:
          accountIsActive &&
          membershipIsActive,
        deactivatedAt:
          !accountIsActive
            ? account.deactivatedAt
            : membership.deactivatedAt,
        canManageSchedule:
          membership.canManageSchedule,
        canManageUsers:
          membership.canManageUsers,
        canManagePayroll:
          membership.canManagePayroll,
        canManageLeaveRequests:
          membership.canManageLeaveRequests,
        canManageCinemaSettings:
          membership.canManageCinemaSettings,
        canSendBroadcastMessages:
          membership.canSendBroadcastMessages,
        canManageAccount: true,
      },
    ];
  });

  return {
    items,
    page: options.page,
    pageSize: USER_LIST_PAGE_SIZE,
    total,
    hasMore:
      skip + items.length < total,
  };
}
