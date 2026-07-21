import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  getRequiredScheduleTemplateCinemaId,
  scheduleTemplateInclude,
  withScheduleTemplateCinemaLock,
} from './schedule-template-service-helpers';

export async function archiveScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);

  const cinemaId =
    getRequiredScheduleTemplateCinemaId(
      user,
      selectedCinemaId,
    );

  return withScheduleTemplateCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findScheduleTemplateForCinema(
          transaction,
          id,
          cinemaId,
        );

      return transaction.scheduleTemplate.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
        include: scheduleTemplateInclude,
      });
    },
  );
}

export async function reactivateScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);

  const cinemaId =
    getRequiredScheduleTemplateCinemaId(
      user,
      selectedCinemaId,
    );

  return withScheduleTemplateCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findScheduleTemplateForCinema(
          transaction,
          id,
          cinemaId,
        );
      const duplicate =
        await transaction.scheduleTemplate.findFirst(
          {
            where: {
              cinemaId,
              name: existing.name,
              isActive: true,
              id: {
                not: existing.id,
              },
            },
            select: {
              id: true,
            },
          },
        );

      if (duplicate) {
        throw new BadRequestException(
          'Aktiv vagtsskabelon findes allerede.',
        );
      }

      return transaction.scheduleTemplate.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: true,
          archivedAt: null,
        },
        include: scheduleTemplateInclude,
      });
    },
  );
}
