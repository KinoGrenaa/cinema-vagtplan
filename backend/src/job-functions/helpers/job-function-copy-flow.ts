import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  JobFunctionCopyData,
  JobFunctionDbClient,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getActorUserId,
  getRequiredJobFunctionCinemaId,
  jobFunctionInclude,
  normalizeJobFunctionName,
  normalizeJobFunctionNameKey,
  parseBooleanValue,
  withJobFunctionCinemaLock,
} from './job-function-service-helpers';

async function getUniqueJobFunctionName(
  transaction: JobFunctionDbClient,
  cinemaId: number,
  sourceName: string,
  requestedName?: string | null,
) {
  if (requestedName !== undefined && requestedName !== null) {
    const name = normalizeJobFunctionName(requestedName);
    const nameKey = normalizeJobFunctionNameKey(name);
    const existing = await transaction.jobFunction.findFirst({
      where: { cinemaId, nameKey },
      select: { id: true },
    });
    if (existing) throw new Error('JOB_FUNCTION_NAME_CONFLICT');
    return { name, nameKey };
  }

  for (let number = 1; number < 10_000; number += 1) {
    const suffix = number === 1 ? ' (kopi)' : ` (kopi ${number})`;
    const name = `${sourceName}${suffix}`;
    const nameKey = normalizeJobFunctionNameKey(name);
    const existing = await transaction.jobFunction.findFirst({
      where: { cinemaId, nameKey },
      select: { id: true },
    });
    if (!existing) return { name, nameKey };
  }

  throw new Error('Kunne ikke finde et unikt navn til kopien.');
}

async function getUniquePayRuleName(
  transaction: JobFunctionDbClient,
  cinemaId: number,
  sourceName: string,
  copiedJobFunctionName: string,
) {
  const base = `${sourceName} – ${copiedJobFunctionName}`;
  for (let number = 1; number < 10_000; number += 1) {
    const name = number === 1 ? base : `${base} (${number})`;
    const nameKey = name.trim().toLocaleLowerCase('da-DK');
    const existing = await transaction.payRule.findFirst({
      where: { cinemaId, nameKey },
      select: { id: true },
    });
    if (!existing) return { name, nameKey };
  }
  throw new Error('Kunne ikke finde et unikt navn til den kopierede lønregel.');
}

export async function copyJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  data: JobFunctionCopyData = {},
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(
    user,
    selectedCinemaId ?? data.cinemaId,
  );
  const copyQualifiedUsers = parseBooleanValue(
    data.copyQualifiedUsers,
    true,
  );
  const copySpecialPayRules = parseBooleanValue(
    data.copySpecialPayRules,
    true,
  );
  const actorUserId = getActorUserId(user);

  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    const source = await findJobFunctionForCinema(
      transaction,
      jobFunctionId,
      cinemaId,
      true,
    );
    const uniqueName = await getUniqueJobFunctionName(
      transaction,
      cinemaId,
      source.name,
      data.name,
    );
    const assignments = copyQualifiedUsers
      ? await transaction.userJobFunction.findMany({
          where: { cinemaId, jobFunctionId: source.id },
          select: { userId: true },
        })
      : [];

    const copied = await transaction.jobFunction.create({
      data: {
        cinemaId,
        name: uniqueName.name,
        nameKey: uniqueName.nameKey,
        description: source.description,
        color: source.color,
        sortOrder: source.sortOrder,
        defaultPayrollExportCodeId: source.defaultPayrollExportCodeId,
        isActive: true,
        archivedAt: null,
        ...(source.timingRule
          ? {
              timingRule: {
                create: {
                  cinemaId,
                  filmWindowStartMinute:
                    source.timingRule.filmWindowStartMinute,
                  filmWindowEndMinute: source.timingRule.filmWindowEndMinute,
                  startAnchor: source.timingRule.startAnchor,
                  startOffsetMinutes: source.timingRule.startOffsetMinutes,
                  startFixedMinute: source.timingRule.startFixedMinute,
                  endAnchor: source.timingRule.endAnchor,
                  endOffsetMinutes: source.timingRule.endOffsetMinutes,
                  endFixedMinute: source.timingRule.endFixedMinute,
                  fallbackStartMinute: source.timingRule.fallbackStartMinute,
                  fallbackEndMinute: source.timingRule.fallbackEndMinute,
                  roundToQuarter: source.timingRule.roundToQuarter,
                  roundStartToNearestQuarter:
                    source.timingRule.roundStartToNearestQuarter,
                  roundEndToNearestQuarter:
                    source.timingRule.roundEndToNearestQuarter,
                  restrictMovieStartsToWindow: source.timingRule.restrictMovieStartsToWindow,
                  clampToDayPeriod: source.timingRule.restrictMovieStartsToWindow,
                  isActive: source.timingRule.isActive,
                },
              },
            }
          : {}),
        ...(assignments.length > 0
          ? {
              userJobFunctions: {
                create: assignments.map(({ userId }) => ({
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

    if (copySpecialPayRules) {
      const sourceRuleVersions = await transaction.payRuleVersion.findMany({
        where: {
          jobFunctionId: source.id,
          status: { not: 'CANCELLED' },
          payRule: { cinemaId, isActive: true },
        },
        include: { payRule: true },
        orderBy: [{ payRuleId: 'asc' }, { validFrom: 'desc' }],
      });
      const latestByRule = new Map<number, (typeof sourceRuleVersions)[number]>();
      for (const version of sourceRuleVersions) {
        if (!latestByRule.has(version.payRuleId)) {
          latestByRule.set(version.payRuleId, version);
        }
      }

      for (const sourceVersion of latestByRule.values()) {
        const ruleName = await getUniquePayRuleName(
          transaction,
          cinemaId,
          sourceVersion.payRule.name,
          copied.name,
        );
        const copiedRule = await transaction.payRule.create({
          data: {
            cinemaId,
            name: ruleName.name,
            nameKey: ruleName.nameKey,
            description: sourceVersion.payRule.description,
            ruleKind: sourceVersion.payRule.ruleKind,
            stackingMode: sourceVersion.payRule.stackingMode,
            exclusiveGroup: sourceVersion.payRule.exclusiveGroup,
            priority: sourceVersion.payRule.priority,
            isActive: true,
          },
        });
        const validFrom = new Date();
        const change = await transaction.payrollConfigurationChange.create({
          data: {
            cinemaId,
            type: 'PAY_RULE',
            payRuleId: copiedRule.id,
            validFrom,
            newValue: {
              copiedFromPayRuleId: sourceVersion.payRuleId,
              copiedFromVersionId: sourceVersion.id,
              jobFunctionId: copied.id,
            },
            reason: `Kopieret sammen med jobfunktionen ${source.name}.`,
            createdByUserId: actorUserId,
          },
        });
        await transaction.payRuleVersion.create({
          data: {
            payRuleId: copiedRule.id,
            validFrom,
            calculationType: sourceVersion.calculationType,
            value: sourceVersion.value,
            windowStartMinute: sourceVersion.windowStartMinute,
            windowEndMinute: sourceVersion.windowEndMinute,
            weekdays: sourceVersion.weekdays,
            specialDayType: sourceVersion.specialDayType,
            jobFunctionId: copied.id,
            status: 'ACTIVE',
            changeId: change.id,
            createdByUserId: actorUserId,
            reason: `Kopieret fra lønregel #${sourceVersion.payRuleId}.`,
          },
        });
      }
    }

    return transaction.jobFunction.findUniqueOrThrow({
      where: { id: copied.id },
      include: jobFunctionInclude,
    });
  });
}
