import { PrismaService } from '../../prisma/prisma.service';
import { getTimeEntryCinemaFilter } from './time-entry-access';
import {
  getOpenTimeEntryInclude,
  getTimeEntryResponseInclude,
} from './time-entry-includes';
import { withTimeEntryDeviation } from './time-entry-deviation';

export async function findTimeEntriesForUser(
  prisma: PrismaService,
  params: {
    userId: number;
    user: any;
    selectedCinemaId?: number | null;
  },
) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: params.userId,
      ...getTimeEntryCinemaFilter(params.user, params.selectedCinemaId),
    },
    include: getTimeEntryResponseInclude(),
    orderBy: {
      clockIn: 'desc',
    },
  });

  return entries.map((entry) => withTimeEntryDeviation(entry));
}

export async function findAllVisibleTimeEntries(
  prisma: PrismaService,
  params: {
    user: any;
    selectedCinemaId?: number | null;
  },
) {
  const cinemaFilter = getTimeEntryCinemaFilter(
    params.user,
    params.selectedCinemaId,
  );

  const entries = await prisma.timeEntry.findMany({
    where:
      params.user.role === 'EMPLOYEE'
        ? {
            userId: params.user.sub,
            ...cinemaFilter,
          }
        : cinemaFilter,
    include: {
      ...getTimeEntryResponseInclude(),
      payrollAdjustments: {
        where: {
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      clockIn: 'desc',
    },
  });

  return entries.map((entry) => withTimeEntryDeviation(entry));
}

export function findOpenTimeEntry(
  prisma: PrismaService,
  params: {
    userId: number;
    cinemaId?: number;
  },
) {
  return prisma.timeEntry.findFirst({
    where: {
      userId: params.userId,
      ...(params.cinemaId ? { cinemaId: params.cinemaId } : {}),
      clockOut: null,
      status: 'PENDING',
    },
    include: getOpenTimeEntryInclude(),
    orderBy: {
      clockIn: 'desc',
    },
  });
}
