import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getRequiredJobFunctionCinemaId,
  jobFunctionInclude,
  withJobFunctionCinemaLock,
} from './job-function-service-helpers';

export async function archiveJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId =
    getRequiredJobFunctionCinemaId(
      user,
      selectedCinemaId,
    );

  return withJobFunctionCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findJobFunctionForCinema(
          transaction,
          id,
          cinemaId,
        );

      if (!existing.isActive) {
        throw new BadRequestException(
          'Jobfunktionen er allerede arkiveret.',
        );
      }

      return transaction.jobFunction.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
        include: jobFunctionInclude,
      });
    },
  );
}

export async function reactivateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId =
    getRequiredJobFunctionCinemaId(
      user,
      selectedCinemaId,
    );

  return withJobFunctionCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findJobFunctionForCinema(
          transaction,
          id,
          cinemaId,
        );

      if (existing.isActive) {
        throw new BadRequestException(
          'Jobfunktionen er allerede aktiv.',
        );
      }

      const duplicate =
        await transaction.jobFunction.findFirst({
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
          'Der findes allerede en aktiv jobfunktion med samme navn.',
        );
      }

      return transaction.jobFunction.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: true,
          archivedAt: null,
        },
        include: jobFunctionInclude,
      });
    },
  );
}
