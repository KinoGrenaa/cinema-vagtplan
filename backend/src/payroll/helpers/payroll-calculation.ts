import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  findVersionAt,
  type VersionInterval,
} from './payroll-version-intervals';
import {
  getPayrollPeriodTimeRange,
  getPayrollReferenceDateFilters,
} from './payroll-periods';

const TIME_ZONE = 'Europe/Copenhagen';
const localFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function localParts(value: Date) {
  const parts = localFormatter.formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekday = get('weekday');
  const isoWeekday = weekdayMap[weekday as keyof typeof weekdayMap] ?? 1;
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minuteOfDay: Number(get('hour')) * 60 + Number(get('minute')),
    isoWeekday,
  };
}
const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function decimalNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function withinWindow(minute: number, start: number, end: number) {
  if (end <= start) return minute >= start || minute < end;
  return minute >= start && minute < end;
}

function ruleMatches(
  rule: any,
  version: any,
  instant: Date,
  jobFunctionId: number | null,
  specialDays: Map<string, Set<string>>,
) {
  const local = localParts(instant);
  if (rule.ruleKind === 'TIME_WINDOW') {
    return (
      Number.isInteger(version.windowStartMinute) &&
      Number.isInteger(version.windowEndMinute) &&
      withinWindow(
        local.minuteOfDay,
        Number(version.windowStartMinute),
        Number(version.windowEndMinute),
      )
    );
  }
  if (rule.ruleKind === 'WEEKDAY') {
    return (version.weekdays ?? []).includes(local.isoWeekday);
  }
  if (rule.ruleKind === 'WEEKEND') {
    return local.isoWeekday === 6 || local.isoWeekday === 7;
  }
  if (rule.ruleKind === 'HOLIDAY') {
    return specialDays.get(local.dateKey)?.has(version.specialDayType) ?? false;
  }
  if (rule.ruleKind === 'JOB_FUNCTION') {
    return jobFunctionId !== null && version.jobFunctionId === jobFunctionId;
  }
  return false;
}

function chooseRuleVersions(
  matches: Array<{ rule: any; version: any }>,
) {
  const stacked = matches.filter(({ rule }) => rule.stackingMode !== 'EXCLUSIVE');
  const exclusive = matches.filter(({ rule }) => rule.stackingMode === 'EXCLUSIVE');
  const groups = new Map<string, Array<{ rule: any; version: any }>>();
  for (const match of exclusive) {
    const group = match.rule.exclusiveGroup || `rule-${match.rule.id}`;
    groups.set(group, [...(groups.get(group) ?? []), match]);
  }
  for (const [group, groupMatches] of groups) {
    const sorted = [...groupMatches].sort(
      (left, right) => right.rule.priority - left.rule.priority,
    );
    if (
      sorted.length > 1 &&
      sorted[0].rule.priority === sorted[1].rule.priority
    ) {
      throw new BadRequestException(
        `Tillægsreglerne i gruppen “${group}” har samme prioritet.`,
      );
    }
    stacked.push(sorted[0]);
  }
  return stacked;
}

type CalculationLineAccumulator = {
  key: string;
  timeEntryId: number;
  membershipId: number;
  jobFunctionId: number | null;
  payrollTypeId: number | null;
  lineType: 'HOURS' | 'BASE_PAY' | 'SUPPLEMENT' | 'ADJUSTMENT';
  segmentStart: Date;
  segmentEnd: Date;
  minutes: number;
  basePayRateVersionId: number | null;
  payRuleVersionId: number | null;
  rate: number | null;
  percentage: number | null;
  unroundedAmount: number;
  metadata: Record<string, unknown>;
};

function appendMinuteLine(
  lines: CalculationLineAccumulator[],
  tailsByKey: Map<string, CalculationLineAccumulator>,
  input: Omit<CalculationLineAccumulator, 'segmentEnd' | 'minutes' | 'unroundedAmount'> & {
    minuteEnd: Date;
    minutes: number;
    amount: number;
  },
) {
  const previous = tailsByKey.get(input.key);
  if (
    previous &&
    previous.segmentEnd.getTime() === input.segmentStart.getTime()
  ) {
    previous.segmentEnd = input.minuteEnd;
    previous.minutes += input.minutes;
    previous.unroundedAmount += input.amount;
    return;
  }
  const created: CalculationLineAccumulator = {
    key: input.key,
    timeEntryId: input.timeEntryId,
    membershipId: input.membershipId,
    jobFunctionId: input.jobFunctionId,
    payrollTypeId: input.payrollTypeId,
    lineType: input.lineType,
    segmentStart: input.segmentStart,
    segmentEnd: input.minuteEnd,
    minutes: input.minutes,
    basePayRateVersionId: input.basePayRateVersionId,
    payRuleVersionId: input.payRuleVersionId,
    rate: input.rate,
    percentage: input.percentage,
    unroundedAmount: input.amount,
    metadata: input.metadata,
  };
  lines.push(created);
  tailsByKey.set(input.key, created);
}

export type PayrollCalculationResult = {
  configurationVersionId: number;
  currencyCode: string;
  totalMinutes: number;
  totalAmount: number;
  checksum: string;
  lines: Array<Omit<CalculationLineAccumulator, 'key'> & { roundedAmount: number }>;
};

function calculationChecksum(lines: Array<{
  timeEntryId?: number | null;
  membershipId: number;
  jobFunctionId?: number | null;
  payrollTypeId?: number | null;
  lineType: string;
  segmentStart: Date;
  segmentEnd: Date;
  minutes: number;
  rate?: number | null;
  percentage?: number | null;
  roundedAmount: number;
  basePayRateVersionId?: number | null;
  payRuleVersionId?: number | null;
  payrollAdjustmentId?: number | null;
}>) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        lines.map((line) => ({
          timeEntryId: line.timeEntryId ?? null,
          membershipId: line.membershipId,
          jobFunctionId: line.jobFunctionId ?? null,
          payrollTypeId: line.payrollTypeId ?? null,
          lineType: line.lineType,
          start: line.segmentStart.toISOString(),
          end: line.segmentEnd.toISOString(),
          minutes: line.minutes,
          rate: line.rate ?? null,
          percentage: line.percentage ?? null,
          amount: line.roundedAmount,
          rateVersion: line.basePayRateVersionId ?? null,
          ruleVersion: line.payRuleVersionId ?? null,
          payrollAdjustmentId: line.payrollAdjustmentId ?? null,
        })),
      ),
    )
    .digest('hex');
}

export async function calculatePayrollPeriod(
  prisma: any,
  params: {
    cinemaId: number;
    startDate: string;
    endDate: string;
    userId?: number | null;
  },
): Promise<PayrollCalculationResult> {
  const range = getPayrollPeriodTimeRange(params.startDate, params.endDate);
  const entries = await prisma.timeEntry.findMany({
    where: {
      cinemaId: params.cinemaId,
      ...(params.userId ? { userId: params.userId } : {}),
      status: 'APPROVED',
      clockOut: { not: null },
      OR: getPayrollReferenceDateFilters(range.start, range.endExclusive),
    },
    include: {
      user: {
        include: {
          cinemaMemberships: {
            where: { cinemaId: params.cinemaId },
            take: 1,
          },
        },
      },
      payrollType: true,
      shift: {
        include: {
          jobFunction: {
            include: { defaultPayrollExportCode: true },
          },
        },
      },
    },
    orderBy: [{ clockIn: 'asc' }, { id: 'asc' }],
  });
  // Periodetilhørsforholdet afgøres fortsat af vagtens start (eller clock-in
  // for manuelle registreringer). Hele registreringen beregnes derefter, også
  // når den går over midnat eller en periodegrænse.
  const calculationStart = entries.reduce(
    (earliest: Date, entry: any) =>
      entry.clockIn < earliest ? entry.clockIn : earliest,
    range.start,
  );
  const calculationEnd = entries.reduce(
    (latest: Date, entry: any) =>
      entry.clockOut && entry.clockOut > latest ? entry.clockOut : latest,
    range.endExclusive,
  );
  const configurationVersions =
    await prisma.cinemaPayrollConfigurationVersion.findMany({
      where: {
        cinemaId: params.cinemaId,
        status: { not: 'CANCELLED' },
        validFrom: { lt: calculationEnd },
        OR: [{ validTo: null }, { validTo: { gt: calculationStart } }],
      },
      orderBy: { validFrom: 'asc' },
    });
  if (configurationVersions.length === 0) {
    throw new BadRequestException('Biografen mangler en lønmodel for perioden.');
  }
  const membershipIds = Array.from(
    new Set(
      entries
        .map((entry: any) => entry.user.cinemaMemberships[0]?.id)
        .filter((id: unknown): id is number => Number.isInteger(id)),
    ),
  );
  const payRates = membershipIds.length
    ? await prisma.membershipPayRateVersion.findMany({
        where: {
          membershipId: { in: membershipIds },
          status: { not: 'CANCELLED' },
          validFrom: { lt: calculationEnd },
          OR: [{ validTo: null }, { validTo: { gt: calculationStart } }],
        },
        orderBy: { validFrom: 'asc' },
      })
    : [];
  const rules = await prisma.payRule.findMany({
    where: { cinemaId: params.cinemaId, isActive: true },
    include: {
      versions: {
        where: {
          status: { not: 'CANCELLED' },
          validFrom: { lt: calculationEnd },
          OR: [{ validTo: null }, { validTo: { gt: calculationStart } }],
        },
        orderBy: { validFrom: 'asc' },
      },
    },
  });
  const specialDayRows = await prisma.cinemaSpecialDay.findMany({
    where: { cinemaId: params.cinemaId, isActive: true },
  });
  const specialDays = new Map<string, Set<string>>();
  for (const day of specialDayRows) {
    const key = day.localDate.toISOString().slice(0, 10);
    specialDays.set(key, new Set([...(specialDays.get(key) ?? []), day.type]));
  }

  const lines: CalculationLineAccumulator[] = [];
  const tailsByKey = new Map<string, CalculationLineAccumulator>();
  let totalMinutes = 0;
  for (const entry of entries) {
    const membership = entry.user.cinemaMemberships[0];
    if (!membership) {
      throw new BadRequestException(
        `Tidsregistrering #${entry.id} mangler et biografmedlemskab.`,
      );
    }
    const start = entry.clockIn;
    const end = entry.clockOut as Date;
    if (end <= start) continue;
    const jobFunctionId = entry.shift?.jobFunctionId ?? null;
    const payrollTypeId =
      entry.payrollTypeId ??
      entry.shift?.jobFunction?.defaultPayrollExportCodeId ??
      null;
    const membershipRates = payRates.filter(
      (version: any) => version.membershipId === membership.id,
    );

    for (let cursor = new Date(start); cursor < end; ) {
      const minuteEnd = new Date(Math.min(end.getTime(), cursor.getTime() + 60_000));
      const minutes = (minuteEnd.getTime() - cursor.getTime()) / 60_000;
      const configuration = findVersionAt(
        configurationVersions as Array<VersionInterval & any>,
        cursor,
      );
      if (!configuration) {
        throw new BadRequestException(
          `Biografens lønmodel mangler ved ${cursor.toISOString()}.`,
        );
      }
      totalMinutes += minutes;
      const baseMetadata = {
        payrollMode: configuration.mode,
        payrollConfigurationVersionId: configuration.id,
        employmentType: membership.employmentType,
        jobFunctionName:
          entry.shift?.jobFunctionNameSnapshot ?? entry.shift?.jobFunction?.name ?? null,
      };

      if (configuration.mode === 'HOURS_ONLY' || membership.employmentType !== 'HOURLY') {
        appendMinuteLine(lines, tailsByKey, {
          key: `${entry.id}:HOURS:${configuration.id}`,
          timeEntryId: entry.id,
          membershipId: membership.id,
          jobFunctionId,
          payrollTypeId,
          lineType: 'HOURS',
          segmentStart: cursor,
          minuteEnd,
          minutes,
          amount: 0,
          basePayRateVersionId: null,
          payRuleVersionId: null,
          rate: null,
          percentage: null,
          metadata: baseMetadata,
        });
        cursor = minuteEnd;
        continue;
      }

      const rateVersion = findVersionAt(
        membershipRates as Array<VersionInterval & any>,
        cursor,
      );
      if (!rateVersion) {
        throw new BadRequestException(
          `Medarbejderen ${entry.user.firstName} ${entry.user.lastName} mangler timeløn ved ${cursor.toISOString()}.`,
        );
      }
      const rate = decimalNumber(rateVersion.hourlyRate);
      const baseAmount = (rate * minutes) / 60;
      appendMinuteLine(lines, tailsByKey, {
        key: `${entry.id}:BASE:${rateVersion.id}:${configuration.id}`,
        timeEntryId: entry.id,
        membershipId: membership.id,
        jobFunctionId,
        payrollTypeId,
        lineType: 'BASE_PAY',
        segmentStart: cursor,
        minuteEnd,
        minutes,
        amount: baseAmount,
        basePayRateVersionId: rateVersion.id,
        payRuleVersionId: null,
        rate,
        percentage: null,
        metadata: baseMetadata,
      });

      if (configuration.mode === 'ADVANCED') {
        const matches = rules
          .map((rule: any) => ({
            rule,
            version: findVersionAt(
              rule.versions as Array<VersionInterval & any>,
              cursor,
            ),
          }))
          .filter(({ version }: any) => Boolean(version))
          .filter(({ rule, version }: any) =>
            ruleMatches(rule, version, cursor, jobFunctionId, specialDays),
          );
        for (const { rule, version } of chooseRuleVersions(matches as any)) {
          const value = decimalNumber(version.value);
          const fixed = version.calculationType === 'FIXED_PER_HOUR';
          const amount = fixed
            ? (value * minutes) / 60
            : (rate * (value / 100) * minutes) / 60;
          appendMinuteLine(lines, tailsByKey, {
            key: `${entry.id}:SUPPLEMENT:${version.id}:${configuration.id}`,
            timeEntryId: entry.id,
            membershipId: membership.id,
            jobFunctionId,
            payrollTypeId: rule.payrollTypeId ?? payrollTypeId,
            lineType: 'SUPPLEMENT',
            segmentStart: cursor,
            minuteEnd,
            minutes,
            amount,
            basePayRateVersionId: rateVersion.id,
            payRuleVersionId: version.id,
            rate: fixed ? value : rate,
            percentage: fixed ? null : value,
            metadata: { ...baseMetadata, payRuleName: rule.name, ruleKind: rule.ruleKind },
          });
        }
      }
      cursor = minuteEnd;
    }
  }

  const finalizedLines = lines.map(({ key: _key, ...line }) => ({
    ...line,
    unroundedAmount: Number(line.unroundedAmount.toFixed(6)),
    roundedAmount: roundMoney(line.unroundedAmount),
  }));
  // Afrunding sker på den samlede lønkomponent (medarbejder, eksportkode,
  // sats og regelversion) og ikke pr. minut eller tilfældigt delsegment.
  const componentGroups = new Map<string, number[]>();
  finalizedLines.forEach((line, index) => {
    const componentKey = [
      line.membershipId,
      line.payrollTypeId ?? 'none',
      line.lineType,
      line.basePayRateVersionId ?? 'none',
      line.payRuleVersionId ?? 'none',
      line.rate ?? 'none',
      line.percentage ?? 'none',
    ].join(':');
    componentGroups.set(componentKey, [
      ...(componentGroups.get(componentKey) ?? []),
      index,
    ]);
  });
  for (const indexes of componentGroups.values()) {
    const target = roundMoney(
      indexes.reduce(
        (sum, index) => sum + finalizedLines[index].unroundedAmount,
        0,
      ),
    );
    const current = roundMoney(
      indexes.reduce(
        (sum, index) => sum + finalizedLines[index].roundedAmount,
        0,
      ),
    );
    const correction = roundMoney(target - current);
    if (correction !== 0 && indexes.length > 0) {
      const lastIndex = indexes[indexes.length - 1];
      finalizedLines[lastIndex].roundedAmount = roundMoney(
        finalizedLines[lastIndex].roundedAmount + correction,
      );
    }
  }
  const totalAmount = roundMoney(
    finalizedLines.reduce((sum, line) => sum + line.roundedAmount, 0),
  );
  const checksum = calculationChecksum(finalizedLines);

  const startConfiguration = findVersionAt(
    configurationVersions as Array<VersionInterval & any>,
    range.start,
  ) ?? configurationVersions[0];

  return {
    configurationVersionId: startConfiguration.id,
    currencyCode: 'DKK',
    totalMinutes: Math.round(totalMinutes),
    totalAmount,
    checksum,
    lines: finalizedLines,
  };
}

export async function createPayrollCalculationRun(
  prisma: any,
  params: {
    cinemaId: number;
    payrollPeriodId: number;
    startDate: string;
    endDate: string;
    createdByUserId: number | null;
    status: 'PREVIEW' | 'LOCKED';
  },
) {
  const calculation = await calculatePayrollPeriod(prisma, params);
  const adjustments = await prisma.payrollAdjustment.findMany({
    where: {
      cinemaId: params.cinemaId,
      settlementPayrollPeriodId: params.payrollPeriodId,
      status: 'INCLUDED',
    },
    include: {
      user: {
        include: {
          cinemaMemberships: {
            where: { cinemaId: params.cinemaId },
            select: { id: true },
            take: 1,
          },
        },
      },
      timeEntry: {
        include: {
          shift: {
            include: {
              jobFunction: {
                include: { defaultPayrollExportCode: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const adjustmentLines = adjustments.map((adjustment: any) => {
    const membership = adjustment.user.cinemaMemberships[0];
    if (!membership) {
      throw new BadRequestException(
        `Efterregulering #${adjustment.id} mangler et biografmedlemskab.`,
      );
    }
    const segmentStart = adjustment.timeEntry.clockIn as Date;
    const candidateEnd = adjustment.timeEntry.clockOut as Date | null;
    const segmentEnd =
      candidateEnd && candidateEnd > segmentStart
        ? candidateEnd
        : new Date(
            segmentStart.getTime() +
              Math.max(Math.abs(adjustment.minutesDelta ?? 0), 1) * 60_000,
          );
    const amount = roundMoney(decimalNumber(adjustment.amountDelta));
    const payrollTypeId =
      adjustment.payrollTypeId ??
      adjustment.timeEntry.payrollTypeId ??
      adjustment.timeEntry.shift?.jobFunction?.defaultPayrollExportCodeId ??
      null;

    return {
      timeEntryId: adjustment.timeEntryId,
      membershipId: membership.id,
      jobFunctionId: adjustment.timeEntry.shift?.jobFunctionId ?? null,
      payrollTypeId,
      lineType: 'ADJUSTMENT' as const,
      segmentStart,
      segmentEnd,
      minutes: Number(adjustment.minutesDelta ?? 0),
      basePayRateVersionId: adjustment.sourcePayRateVersionId ?? null,
      payRuleVersionId: adjustment.sourcePayRuleVersionId ?? null,
      payrollAdjustmentId: adjustment.id,
      rate: null,
      percentage: null,
      unroundedAmount: amount,
      roundedAmount: amount,
      metadata: {
        payrollAdjustmentType: adjustment.type,
        exportCategory: adjustment.exportCategory,
        reason: adjustment.reason,
        userId: adjustment.userId,
        currencyCode: adjustment.currencyCode || calculation.currencyCode,
        originalPayrollPeriodId: adjustment.originalPayrollPeriodId,
      },
    };
  });

  const combinedLines = [...calculation.lines, ...adjustmentLines];
  const totalAmount = roundMoney(
    combinedLines.reduce((sum, line) => sum + line.roundedAmount, 0),
  );
  const checksum = calculationChecksum(combinedLines);
  const run = await prisma.payrollCalculationRun.create({
    data: {
      cinemaId: params.cinemaId,
      payrollPeriodId: params.payrollPeriodId,
      payrollConfigurationVersionId: calculation.configurationVersionId,
      status: params.status,
      currencyCode: calculation.currencyCode,
      totalMinutes: calculation.totalMinutes,
      totalAmount: totalAmount.toFixed(2),
      checksum,
      createdByUserId: params.createdByUserId,
    },
  });
  if (combinedLines.length > 0) {
    await prisma.payrollCalculationLine.createMany({
      data: combinedLines.map((line) => ({
        calculationRunId: run.id,
        timeEntryId: line.timeEntryId,
        membershipId: line.membershipId,
        jobFunctionId: line.jobFunctionId,
        payrollTypeId: line.payrollTypeId,
        lineType: line.lineType,
        segmentStart: line.segmentStart,
        segmentEnd: line.segmentEnd,
        minutes: Math.round(line.minutes),
        basePayRateVersionId: line.basePayRateVersionId,
        payRuleVersionId: line.payRuleVersionId,
        payrollAdjustmentId: 'payrollAdjustmentId' in line
          ? line.payrollAdjustmentId
          : null,
        rate: line.rate === null ? null : line.rate.toFixed(4),
        percentage: line.percentage === null ? null : line.percentage.toFixed(4),
        unroundedAmount: line.unroundedAmount.toFixed(6),
        roundedAmount: line.roundedAmount.toFixed(2),
        metadata: line.metadata,
      })),
    });
  }
  return prisma.payrollCalculationRun.findUnique({
    where: { id: run.id },
    include: { lines: { orderBy: [{ segmentStart: 'asc' }, { id: 'asc' }] } },
  });
}
