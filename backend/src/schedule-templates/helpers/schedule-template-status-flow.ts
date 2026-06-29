import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  getRequiredScheduleTemplateCinemaId,
  scheduleTemplateInclude,
} from './schedule-template-service-helpers';

export async function archiveScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, selectedCinemaId);
  const existing = await findScheduleTemplateForCinema(prisma, id, cinemaId);

  return prisma.scheduleTemplate.update({
    where: { id: existing.id },
    data: {
      isActive: false,
      archivedAt: new Date(),
    },
    include: scheduleTemplateInclude,
  });
}

export async function reactivateScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, selectedCinemaId);
  const existing = await findScheduleTemplateForCinema(prisma, id, cinemaId);

  const duplicate = await prisma.scheduleTemplate.findFirst({
    where: {
      cinemaId,
      name: existing.name,
      isActive: true,
      id: { not: existing.id },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new BadRequestException('Aktiv vagtsskabelon findes allerede.');
  }

  return prisma.scheduleTemplate.update({
    where: { id: existing.id },
    data: {
      isActive: true,
      archivedAt: null,
    },
    include: scheduleTemplateInclude,
  });
}
