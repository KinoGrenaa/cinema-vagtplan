import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensureWorkTypeAdmin,
  findWorkTypeForCinema,
  getRequiredWorkTypeCinemaId,
  withWorkTypeCinemaLock,
  workTypeInclude,
  type AuthUser,
  type CinemaContextValue,
} from './work-type-service-helpers';

export async function archiveWorkType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(
    user,
    selectedCinemaId,
  );

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

      if (!existing.isActive) {
        throw new BadRequestException(
          'Vagttypen er allerede arkiveret',
        );
      }

      return transaction.workType.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
        include: workTypeInclude,
      });
    },
  );
}

export async function reactivateWorkType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(
    user,
    selectedCinemaId,
  );

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

      if (existing.isActive) {
        throw new BadRequestException(
          'Vagttypen er allerede aktiv',
        );
      }

      const duplicate =
        await transaction.workType.findFirst({
          where: {
            name: existing.name,
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
          'Der findes allerede en aktiv vagttype med samme navn',
        );
      }

      return transaction.workType.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: true,
          archivedAt: null,
        },
        include: workTypeInclude,
      });
    },
  );
}
