import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  getRequiredScheduleTemplateCinemaId,
  normalizeOptionalText,
  normalizeScheduleTemplateName,
  normalizeWeekParity,
  parseOptionalDate,
  parseOptionalSortOrder,
  ScheduleTemplateUpdateData,
  scheduleTemplateInclude,
} from './schedule-template-service-helpers';

export async function updateScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: ScheduleTemplateUpdateData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );

  const existing = await findScheduleTemplateForCinema(prisma, id, cinemaId);
  const updateData: Record<string, unknown> = {};

  if (data?.name !== undefined) {
    const name = normalizeScheduleTemplateName(data.name);
    const duplicate = await prisma.scheduleTemplate.findFirst({
      where: {
        cinemaId,
        name,
        isActive: true,
        id: { not: existing.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('Aktiv vagtsskabelon findes allerede.');
    }
    updateData.name = name;
  }

  const description = normalizeOptionalText(data?.description);
  if (description !== undefined) updateData.description = description;

  const weekParity = normalizeWeekParity(data?.weekParity);
  if (weekParity !== undefined) updateData.weekParity = weekParity;

  const startsOn = parseOptionalDate(data?.startsOn);
  if (startsOn !== undefined) updateData.startsOn = startsOn;

  const sortOrder = parseOptionalSortOrder(data?.sortOrder);
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  return prisma.scheduleTemplate.update({
    where: { id: existing.id },
    data: updateData,
    include: scheduleTemplateInclude,
  });
}
