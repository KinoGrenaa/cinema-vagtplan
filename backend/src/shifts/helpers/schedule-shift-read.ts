import type { PrismaService } from '../../prisma/prisma.service';
import { getCopenhagenDayRange } from './shift-service-helpers';

export const scheduleShiftSelect = {
  id: true,
  startTime: true,
  endTime: true,
  note: true,
  userId: true,
  jobFunctionId: true,
  jobFunctionNameSnapshot: true,
  jobFunctionColorSnapshot: true,
  timingSource: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImage: true,
    },
  },
  jobFunction: {
    select: { id: true, name: true, color: true, isActive: true },
  },
  staffingRequests: {
    where: {
      status: 'PENDING',
    },
    select: {
      id: true,
      type: true,
      targetUserId: true,
      targetUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
    take: 1,
  },
  trades: {
    where: {
      status: 'OPEN',
    },
    select: {
      id: true,
      type: true,
      targetUserId: true,
      targetUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
    take: 1,
  },
} as const;

export async function findScheduleShiftsForDay(
  prisma: PrismaService,
  cinemaId: number,
  date: string,
) {
  const { start, end } = getCopenhagenDayRange(date);
  return prisma.shift.findMany({
    where: {
      cinemaId,
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
    select: scheduleShiftSelect,
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
  });
}
