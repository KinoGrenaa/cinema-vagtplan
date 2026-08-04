import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  JobFunctionUpdateData,
} from './job-function-service-helpers';
import {
  ensureAssignableJobFunctionUsers,
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
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
    selectedCinemaId ?? data?.cinemaId,
  );
  const name =
    data?.name === undefined ? undefined : normalizeJobFunctionName(data.name);
  const nameKey = name === undefined ? undefined : normalizeJobFunctionNameKey(name);
  const description = normalizeOptionalText(data?.description);
  const color = normalizeJobFunctionColor(data?.color);
  const sortOrder = parseOptionalSortOrder(data?.sortOrder);
  const userIds = parsePositiveIdList(data?.userIds);
  const actorUserId = getActorUserId(user);

  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    const existing = await findJobFunctionForCinema(transaction, id, cinemaId);
    const defaultPayrollExportCodeId =
      data?.defaultPayrollExportCodeId === undefined &&
      data?.payrollTypeId === undefined
        ? undefined
        : await getPayrollExportCodeIdForCinema(
            transaction,
            cinemaId,
            data.defaultPayrollExportCodeId ?? data.payrollTypeId,
          );

    if (nameKey !== undefined && nameKey !== existing.nameKey) {
      const duplicate = await transaction.jobFunction.findFirst({
        where: { nameKey, id: { not: existing.id }, cinemaId },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException(
          'Der findes allerede en jobfunktion med samme navn.',
        );
      }
    }

    if (userIds !== undefined) {
      await ensureAssignableJobFunctionUsers(transaction, userIds, cinemaId);
    }

    const updateData: Prisma.JobFunctionUncheckedUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (nameKey !== undefined) updateData.nameKey = nameKey;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (defaultPayrollExportCodeId !== undefined) {
      updateData.defaultPayrollExportCodeId = defaultPayrollExportCodeId;
    }

    await transaction.jobFunction.update({
      where: { id: existing.id },
      data: updateData,
    });

    if (data?.timingRule !== undefined) {
      if (data.timingRule === null) {
        await transaction.jobFunctionTimingRule.updateMany({
          where: { jobFunctionId: existing.id },
          data: { isActive: false },
        });
      } else {
        const normalized = normalizeTimingRuleData(data.timingRule);
        await transaction.jobFunctionTimingRule.upsert({
          where: { jobFunctionId: existing.id },
          create: {
            cinemaId,
            jobFunctionId: existing.id,
            ...normalized,
            isActive: true,
          },
          update: { ...normalized, isActive: true },
        });
      }
    }

    if (userIds !== undefined) {
      await transaction.userJobFunction.deleteMany({
        where: { cinemaId, jobFunctionId: existing.id },
      });
      if (userIds.length > 0) {
        await transaction.userJobFunction.createMany({
          data: userIds.map((userId) => ({
            cinemaId,
            jobFunctionId: existing.id,
            userId,
            assignedByUserId: actorUserId,
          })),
        });
      }
    }

    return transaction.jobFunction.findUniqueOrThrow({
      where: { id: existing.id },
      include: jobFunctionInclude,
    });
  });
}
