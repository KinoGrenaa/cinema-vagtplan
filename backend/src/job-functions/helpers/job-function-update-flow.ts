import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  JobFunctionUpdateData,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getDayPeriodIdForCinema,
  getRequiredJobFunctionCinemaId,
  jobFunctionInclude,
  normalizeJobFunctionColor,
  normalizeJobFunctionName,
  normalizeOptionalText,
  parseOptionalSortOrder,
} from './job-function-service-helpers';

export async function updateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: JobFunctionUpdateData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId = getRequiredJobFunctionCinemaId(
    user,
    selectedCinemaId ?? data.cinemaId,
  );
  const existing = await findJobFunctionForCinema(prisma, id, cinemaId);

  const name =
    data.name === undefined ? undefined : normalizeJobFunctionName(data.name);
  const description = normalizeOptionalText(data.description);
  const color = normalizeJobFunctionColor(data.color);
  const sortOrder = parseOptionalSortOrder(data.sortOrder);
  const dayPeriodId =
    data.dayPeriodId === undefined
      ? undefined
      : await getDayPeriodIdForCinema(prisma, cinemaId, data.dayPeriodId);

  if (name && name !== existing.name) {
    const duplicate = await prisma.jobFunction.findFirst({
      where: {
        name,
        isActive: true,
        id: { not: id },
        cinemaId,
      },
    });

    if (duplicate) {
      throw new BadRequestException('Aktiv jobfunktion findes allerede.');
    }
  }

  const updateData: {
    name?: string;
    description?: string | null;
    color?: string;
    sortOrder?: number;
    dayPeriodId?: number | null;
  } = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
  if (dayPeriodId !== undefined) updateData.dayPeriodId = dayPeriodId;

  return prisma.jobFunction.update({
    where: { id },
    data: updateData,
    include: jobFunctionInclude,
  });
}
