import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureActiveJobFunctionForCinema,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  findScheduleTemplateJobFunctionForCinema,
  getRequiredScheduleTemplateCinemaId,
  normalizeOptionalText,
  parseOptionalPositiveId,
  parseOptionalSortOrder,
  parseRequiredCount,
  parseRequiredPositiveId,
  parseWeekday,
  ScheduleTemplateJobFunctionData,
  scheduleTemplateJobFunctionInclude,
} from './schedule-template-service-helpers';

export async function addScheduleTemplateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  weekdayValue: number,
  data: ScheduleTemplateJobFunctionData,
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
  const jobFunctionId = parseRequiredPositiveId(
    data?.jobFunctionId,
    'Jobfunktion skal være et gyldigt ID.',
  );
  await ensureActiveJobFunctionForCinema(prisma, jobFunctionId, cinemaId);

  const requiredCount = parseRequiredCount(data?.requiredCount);
  const sortOrder = parseOptionalSortOrder(data?.sortOrder) ?? 0;
  const note = normalizeOptionalText(data?.note) ?? null;

  const day = await prisma.scheduleTemplateDay.upsert({
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
      isActive: true,
      sortOrder: weekday,
    },
    update: {},
  });

  return prisma.scheduleTemplateJobFunction.create({
    data: {
      cinemaId,
      templateDayId: day.id,
      jobFunctionId,
      requiredCount,
      sortOrder,
      note,
    },
    include: scheduleTemplateJobFunctionInclude,
  });
}

export async function updateScheduleTemplateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  data: ScheduleTemplateJobFunctionData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  await findScheduleTemplateForCinema(prisma, templateId, cinemaId, true);
  const existing = await findScheduleTemplateJobFunctionForCinema(
    prisma,
    templateJobFunctionId,
    templateId,
    cinemaId,
  );

  const updateData: Record<string, unknown> = {};
  const jobFunctionId = parseOptionalPositiveId(
    data?.jobFunctionId,
    'Jobfunktion skal være et gyldigt ID.',
  );
  if (jobFunctionId !== undefined && jobFunctionId !== null) {
    await ensureActiveJobFunctionForCinema(prisma, jobFunctionId, cinemaId);
    updateData.jobFunctionId = jobFunctionId;
  }

  const requiredCount = parseRequiredCount(data?.requiredCount);
  if (data?.requiredCount !== undefined) updateData.requiredCount = requiredCount;

  const sortOrder = parseOptionalSortOrder(data?.sortOrder);
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  const note = normalizeOptionalText(data?.note);
  if (note !== undefined) updateData.note = note;

  return prisma.scheduleTemplateJobFunction.update({
    where: { id: existing.id },
    data: updateData,
    include: scheduleTemplateJobFunctionInclude,
  });
}

export async function removeScheduleTemplateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, selectedCinemaId);
  await findScheduleTemplateForCinema(prisma, templateId, cinemaId, true);
  const existing = await findScheduleTemplateJobFunctionForCinema(
    prisma,
    templateJobFunctionId,
    templateId,
    cinemaId,
  );

  return prisma.scheduleTemplateJobFunction.delete({
    where: { id: existing.id },
    include: scheduleTemplateJobFunctionInclude,
  });
}
