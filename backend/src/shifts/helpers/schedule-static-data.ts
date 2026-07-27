import type {
  PrismaService,
} from '../../prisma/prisma.service';

export const scheduleStaticUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImage: true,
} as const;

export const scheduleStaticWorkTypeSelect = {
  id: true,
  name: true,
  color: true,
} as const;

export async function findScheduleStaticData(
  prisma: PrismaService,
  cinemaId: number,
) {
  const [
    memberships,
    workTypes,
  ] = await Promise.all([
    prisma.userCinemaMembership.findMany({
      where: {
        cinemaId,
        isActive: true,
        user: {
          isActive: true,
          role: {
            not: 'MASTER',
          },
        },
      },
      select: {
        role: true,
        user: {
          select:
            scheduleStaticUserSelect,
        },
      },
      orderBy: [
        {
          user: {
            firstName: 'asc',
          },
        },
        {
          user: {
            lastName: 'asc',
          },
        },
        {
          userId: 'asc',
        },
      ],
    }),
    prisma.workType.findMany({
      where: {
        cinemaId,
        isActive: true,
      },
      select:
        scheduleStaticWorkTypeSelect,
      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    }),
  ]);

  return {
    users:
      memberships.map(
        (membership) => ({
          ...membership.user,
          role:
            membership.role,
          cinemaId,
        }),
      ),
    workTypes,
  };
}
