import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  getRequiredScheduleTemplateCinemaId,
  normalizeOptionalText,
  parseOptionalBoolean,
  parseOptionalSortOrder,
  parseWeekday,
  ScheduleTemplateDayData,
  scheduleTemplateDayInclude,
} from './schedule-template-service-helpers';

export async function findScheduleTemplateDays(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, selectedCinemaId);
  const template = await findScheduleTemplateForCinema(
    prisma,
    templateId,
    cinemaId,
  );

  return prisma.scheduleTemplateDay.findMany({
    where: {
      templateId: template.id,
      cinemaId,
    },
    include: scheduleTemplateDayInclude,
    orderBy: [{ weekday: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  });
}

export async function upsertScheduleTemplateDay(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  weekdayValue: number,
  data: ScheduleTemplateDayData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  const weekday = parseWeekday(weekdayValue);
  const template = await findScheduleTemplateForCinema(
    prisma,
    templateId,
    cinemaId,
    true,
  );

  const note = normalizeOptionalText(data?.note);
  const isActive = parseOptionalBoolean(data?.isActive);
  const sortOrder = parseOptionalSortOrder(data?.sortOrder);

  return prisma.scheduleTemplateDay.upsert({
    where: {
      templateId_weekday: {
        templateId: template.id,
        weekday,
      },
    },
    create: {
      cinemaId,
      templateId: template.id,
      weekday,
      note: note ?? null,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    },
    update: {
      ...(note !== undefined ? { note } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
    include: scheduleTemplateDayInclude,
  });
}
