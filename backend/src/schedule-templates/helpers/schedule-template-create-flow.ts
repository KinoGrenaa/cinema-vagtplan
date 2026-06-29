import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  ensureScheduleTemplateAdmin,
  getRequiredScheduleTemplateCinemaId,
  normalizeOptionalText,
  normalizeScheduleTemplateName,
  normalizeWeekParity,
  parseOptionalDate,
  parseOptionalSortOrder,
  ScheduleTemplateCreateData,
  scheduleTemplateInclude,
} from './schedule-template-service-helpers';

export async function createScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  data: ScheduleTemplateCreateData,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, data?.cinemaId);
  const name = normalizeScheduleTemplateName(data?.name);
  const description = normalizeOptionalText(data?.description);
  const weekParity = normalizeWeekParity(data?.weekParity) ?? 'ANY';
  const startsOn = parseOptionalDate(data?.startsOn);
  const sortOrder = parseOptionalSortOrder(data?.sortOrder) ?? 0;

  const existing = await prisma.scheduleTemplate.findFirst({
    where: {
      cinemaId,
      name,
      isActive: true,
    },
    select: { id: true },
  });

  if (existing) {
    throw new BadRequestException('Aktiv vagtsskabelon findes allerede.');
  }

  return prisma.scheduleTemplate.create({
    data: {
      cinemaId,
      name,
      description,
      weekParity,
      startsOn,
      sortOrder,
    },
    include: scheduleTemplateInclude,
  });
}
