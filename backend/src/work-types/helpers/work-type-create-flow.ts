import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensureWorkTypeAdmin,
  getPayrollTypeIdForCinema,
  getRequiredWorkTypeCinemaId,
  normalizeWorkTypeColor,
  normalizeWorkTypeName,
  withWorkTypeCinemaLock,
  workTypeInclude,
  type AuthUser,
  type WorkTypeData,
} from './work-type-service-helpers';

export async function createWorkType(
  prisma: PrismaService,
  user: AuthUser,
  data: WorkTypeData,
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(
    user,
    data?.cinemaId,
  );
  const name = normalizeWorkTypeName(
    data?.name,
  );
  const color = normalizeWorkTypeColor(
    data?.color,
  );

  return withWorkTypeCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const payrollTypeId =
        await getPayrollTypeIdForCinema(
          transaction,
          cinemaId,
          data?.payrollTypeId,
        );
      const existing =
        await transaction.workType.findFirst({
          where: {
            name,
            isActive: true,
            cinemaId,
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        throw new BadRequestException(
          'Aktiv vagttype findes allerede',
        );
      }

      return transaction.workType.create({
        data: {
          name,
          color,
          cinemaId,
          payrollTypeId,
          isActive: true,
          archivedAt: null,
        },
        include: workTypeInclude,
      });
    },
  );
}
