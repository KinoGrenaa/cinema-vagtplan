import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './job-function-service-helpers';
import {
  getRequiredJobFunctionCinemaId,
  jobFunctionInclude,
} from './job-function-service-helpers';

export async function findJobFunctions(
  prisma: PrismaService,
  user: AuthUser,
  includeArchived = false,
  selectedCinemaId?: CinemaContextValue,
) {
  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);

  return prisma.jobFunction.findMany({
    where: {
      cinemaId,
      ...(includeArchived ? {} : { isActive: true }),
    },
    include: jobFunctionInclude,
    orderBy: [
      { isActive: 'desc' },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });
}
