import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  getRequiredScheduleTemplateCinemaId,
  scheduleTemplateInclude,
} from './schedule-template-service-helpers';

export async function findScheduleTemplates(
  prisma: PrismaService,
  user: AuthUser,
  includeArchived = false,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, selectedCinemaId);

  return prisma.scheduleTemplate.findMany({
    where: {
      cinemaId,
      ...(includeArchived ? {} : { isActive: true }),
    },
    include: scheduleTemplateInclude,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  });
}

export async function getScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, selectedCinemaId);

  return findScheduleTemplateForCinema(prisma, id, cinemaId);
}
