import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensureWorkTypeAdmin,
  findWorkTypeForCinema,
  getPayrollTypeIdForCinema,
  getRequiredWorkTypeCinemaId,
  normalizeWorkTypeColor,
  normalizeWorkTypeName,
  withWorkTypeCinemaLock,
  workTypeInclude,
  type AuthUser,
  type CinemaContextValue,
  type WorkTypeData,
} from './work-type-service-helpers';

export async function updateWorkType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: WorkTypeData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  const name =
    data?.name === undefined
      ? undefined
      : normalizeWorkTypeName(data.name);
  const color =
    data?.color === undefined
      ? undefined
      : normalizeWorkTypeColor(data.color);

  return withWorkTypeCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findWorkTypeForCinema(
          transaction,
          id,
          cinemaId,
        );
      const updateData: Prisma.WorkTypeUncheckedUpdateInput =
        {};

      if (
        name !== undefined &&
        name !== existing.name
      ) {
        const duplicate =
          await transaction.workType.findFirst({
            where: {
              name,
              isActive: true,
              id: {
                not: existing.id,
              },
              cinemaId,
            },
            select: {
              id: true,
            },
          });

        if (duplicate) {
          throw new BadRequestException(
            'Aktiv vagttype findes allerede',
          );
        }

        updateData.name = name;
      }

      if (color !== undefined) {
        updateData.color = color;
      }

      if (data?.payrollTypeId !== undefined) {
        updateData.payrollTypeId =
          await getPayrollTypeIdForCinema(
            transaction,
            cinemaId,
            data.payrollTypeId,
          );
      }

      return transaction.workType.update({
        where: {
          id: existing.id,
        },
        data: updateData,
        include: workTypeInclude,
      });
    },
  );
}
