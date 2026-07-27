import {
  LeaveStatus,
  Prisma,
} from '@prisma/client';

import type {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getCopenhagenDateStart,
} from './leave-request-page';
import {
  type AuthUser,
  requireUserId,
} from './leave-request-service-helpers';

export const scheduleLeaveRequestSelect = {
  id: true,
  startDate: true,
  endDate: true,
  reason: true,
  status: true,
  createdAt: true,
  cinemaId: true,
  userId: true,
  createdByUserId: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

export function buildScheduleLeaveRequestWhere(
  user: AuthUser,
  cinemaId: number,
  date: string,
): Prisma.LeaveRequestWhereInput {
  const start =
    getCopenhagenDateStart(
      date,
    );
  const end =
    getCopenhagenDateStart(
      date,
      1,
    );
  const canViewAll =
    user.role === 'ADMIN' ||
    user.role === 'MASTER';

  return {
    cinemaId,
    status: {
      in: [
        LeaveStatus.PENDING,
        LeaveStatus.APPROVED,
      ],
    },
    startDate: {
      lt: end,
    },
    endDate: {
      gt: start,
    },
    ...(canViewAll
      ? {}
      : {
          userId:
            requireUserId(user),
        }),
  };
}

export function findScheduleLeaveRequestsForDay(
  prisma: PrismaService,
  user: AuthUser,
  cinemaId: number,
  date: string,
) {
  return prisma.leaveRequest.findMany({
    where:
      buildScheduleLeaveRequestWhere(
        user,
        cinemaId,
        date,
      ),
    select:
      scheduleLeaveRequestSelect,
    orderBy: [
      {
        startDate: 'asc',
      },
      {
        userId: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  });
}
