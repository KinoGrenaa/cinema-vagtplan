import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  JobFunctionCreateData,
} from './job-function-service-helpers';
import {
  ensureAssignableJobFunctionUsers,
  ensureJobFunctionAdmin,
  getActorUserId,
  getPayrollExportCodeIdForCinema,
  getRequiredJobFunctionCinemaId,
  jobFunctionInclude,
  normalizeJobFunctionColor,
  normalizeJobFunctionName,
  normalizeJobFunctionNameKey,
  normalizeOptionalText,
  parseOptionalSortOrder,
  parsePositiveIdList,
  withJobFunctionCinemaLock,
} from './job-function-service-helpers';
import { normalizeTimingRuleData } from './job-function-timing-rule-flow';

export async function createJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  data: JobFunctionCreateData,
) {
  ensureJobFunctionAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(user, data?.cinemaId);
  const name = normalizeJobFunctionName(data?.name);
  const nameKey = normalizeJobFunctionNameKey(name);
  const description = normalizeOptionalText(data?.description) ?? null;
  const color = normalizeJobFunctionColor(data?.color) ?? '#2563eb';
  const sortOrder = parseOptionalSortOrder(data?.sortOrder) ?? 0;
  const userIds = parsePositiveIdList(data?.userIds) ?? [];
  const actorUserId = getActorUserId(user);

  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    const defaultPayrollExportCodeId =
      (await getPayrollExportCodeIdForCinema(
        transaction,
        cinemaId,
        data?.defaultPayrollExportCodeId ?? data?.payrollTypeId,
      )) ?? null;
    const existing = await transaction.jobFunction.findFirst({
      where: { nameKey, cinemaId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Der findes allerede en jobfunktion med samme navn.',
      );
    }
    await ensureAssignableJobFunctionUsers(transaction, userIds, cinemaId);

    const jobFunction = await transaction.jobFunction.create({
      data: {
        name,
        nameKey,
        description,
        color,
        sortOrder,
        defaultPayrollExportCodeId,
        cinemaId,
        isActive: true,
        archivedAt: null,
        ...(data?.timingRule
          ? {
              timingRule: {
                create: {
                  cinemaId,
                  ...normalizeTimingRuleData(data.timingRule),
                  isActive: true,
                },
              },
            }
          : {}),
        ...(userIds.length > 0
          ? {
              userJobFunctions: {
                create: userIds.map((userId) => ({
                  cinemaId,
                  userId,
                  assignedByUserId: actorUserId,
                })),
              },
            }
          : {}),
      },
      include: jobFunctionInclude,
    });

    return jobFunction;
  });
}
