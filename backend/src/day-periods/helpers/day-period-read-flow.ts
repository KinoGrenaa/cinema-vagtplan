import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './day-period-service-helpers';
import { getRequiredDayPeriodCinemaId } from './day-period-service-helpers';

export async function findDayPeriods(
  prisma: PrismaService,
  user: AuthUser,
  includeArchived = false,
  selectedCinemaId?: CinemaContextValue,
) {
  const cinemaId = getRequiredDayPeriodCinemaId(user, selectedCinemaId);

  return prisma.dayPeriod.findMany({
    where: {
      cinemaId,
      ...(includeArchived ? {} : { isActive: true }),
    },
    orderBy: [
      { isActive: 'desc' },
      { sortOrder: 'asc' },
      { startMinute: 'asc' },
      { name: 'asc' },
    ],
  });
}
