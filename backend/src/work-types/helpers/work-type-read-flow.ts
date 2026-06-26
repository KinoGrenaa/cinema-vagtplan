import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './work-type-service-helpers';
import { getRequiredWorkTypeCinemaId } from './work-type-service-helpers';

export async function findWorkTypes(
  prisma: PrismaService,
  user: AuthUser,
  includeArchived = false,
  selectedCinemaId?: CinemaContextValue,
) {
  const cinemaId = getRequiredWorkTypeCinemaId(user, selectedCinemaId);

  return prisma.workType.findMany({
    where: {
      cinemaId,
      ...(includeArchived ? {} : { isActive: true }),
    },

    include: {
      payrollType: true,
    },

    orderBy: [
      {
        isActive: 'desc',
      },
      {
        name: 'asc',
      },
    ],
  });
}
