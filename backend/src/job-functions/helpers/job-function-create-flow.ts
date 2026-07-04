import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  JobFunctionCreateData,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  getDayPeriodIdForCinema,
  getRequiredJobFunctionCinemaId,
  getWorkTypeIdForCinema,
  getWorkTypeIdForPayrollType,
  jobFunctionInclude,
  normalizeJobFunctionColor,
  normalizeJobFunctionName,
  normalizeOptionalText,
  parseOptionalSortOrder,
} from './job-function-service-helpers';

export async function createJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  data: JobFunctionCreateData,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId = getRequiredJobFunctionCinemaId(user, data.cinemaId);
  const name = normalizeJobFunctionName(data.name);
  const description = normalizeOptionalText(data.description) ?? null;
  const color = normalizeJobFunctionColor(data.color) ?? '#2563eb';
  const sortOrder = parseOptionalSortOrder(data.sortOrder) ?? 0;
  const dayPeriodId =
    (await getDayPeriodIdForCinema(prisma, cinemaId, data.dayPeriodId)) ?? null;
  const resolvedWorkTypeId = data.payrollTypeId !== undefined
    ? await getWorkTypeIdForPayrollType(prisma, cinemaId, data.payrollTypeId)
    : await getWorkTypeIdForCinema(prisma, cinemaId, data.workTypeId);
  const workTypeId = resolvedWorkTypeId ?? null;

  const existing = await prisma.jobFunction.findFirst({
    where: {
      name,
      isActive: true,
      cinemaId,
    },
  });

  if (existing) {
    throw new BadRequestException('Aktiv jobfunktion findes allerede.');
  }

  return prisma.jobFunction.create({
    data: {
      name,
      description,
      color,
      sortOrder,
      dayPeriodId,
      workTypeId,
      cinemaId,
      isActive: true,
      archivedAt: null,
    },
    include: jobFunctionInclude,
  });
}
