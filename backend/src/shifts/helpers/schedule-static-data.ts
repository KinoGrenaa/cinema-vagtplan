import type { PrismaService } from '../../prisma/prisma.service';

export const scheduleStaticUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImage: true,
} as const;

export const scheduleStaticJobFunctionSelect = {
  id: true,
  name: true,
  color: true,
  sortOrder: true,
  timingRule: {
    select: {
      filmWindowStartMinute: true,
      filmWindowEndMinute: true,
      startAnchor: true,
      startOffsetMinutes: true,
      startFixedMinute: true,
      endAnchor: true,
      endOffsetMinutes: true,
      endFixedMinute: true,
      fallbackStartMinute: true,
      fallbackEndMinute: true,
      roundStartToNearestQuarter: true,
      roundEndToNearestQuarter: true,
      restrictMovieStartsToWindow: true,
      isActive: true,
    },
  },
} as const;

export async function findScheduleStaticData(
  prisma: PrismaService,
  cinemaId: number,
) {
  const [memberships, jobFunctions] = await Promise.all([
    prisma.userCinemaMembership.findMany({
      where: {
        cinemaId,
        isActive: true,
        user: { isActive: true, role: { not: 'MASTER' } },
      },
      select: { role: true, user: { select: scheduleStaticUserSelect } },
      orderBy: [
        { user: { firstName: 'asc' } },
        { user: { lastName: 'asc' } },
        { userId: 'asc' },
      ],
    }),
    prisma.jobFunction.findMany({
      where: { cinemaId, isActive: true },
      select: scheduleStaticJobFunctionSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    }),
  ]);

  return {
    users: memberships.map((membership) => ({
      ...membership.user,
      role: membership.role,
      cinemaId,
    })),
    jobFunctions,
  };
}
