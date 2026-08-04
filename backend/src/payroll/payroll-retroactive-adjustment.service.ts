import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculatePayrollPeriod } from './helpers/payroll-calculation';

const MONEY_ADJUSTMENT_TYPES = [
  'PAY_RATE_CHANGE',
  'PAY_RULE_CHANGE',
  'PAYROLL_MODE_CHANGE',
] as const;

type MoneyAdjustmentType = (typeof MONEY_ADJUSTMENT_TYPES)[number];

type CalculationLineLike = {
  id?: number;
  timeEntryId: number | null;
  membershipId: number;
  payrollTypeId: number | null;
  lineType: string;
  minutes: number;
  roundedAmount: unknown;
  basePayRateVersionId: number | null;
  payRuleVersionId: number | null;
};

type GroupedCalculation = {
  amount: number;
  minutes: number;
  membershipId: number;
  payrollTypeId: number | null;
  sourceLineId: number | null;
  sourcePayRateVersionId: number | null;
  sourcePayRuleVersionId: number | null;
};

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundedMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function groupCalculationLines(lines: CalculationLineLike[]) {
  const grouped = new Map<number, GroupedCalculation>();

  for (const line of lines) {
    if (!line.timeEntryId) continue;
    const current = grouped.get(line.timeEntryId) ?? {
      amount: 0,
      minutes: 0,
      membershipId: line.membershipId,
      payrollTypeId: line.payrollTypeId,
      sourceLineId: null,
      sourcePayRateVersionId: null,
      sourcePayRuleVersionId: null,
    };
    current.amount += money(line.roundedAmount);
    if (line.lineType === 'HOURS' || line.lineType === 'BASE_PAY') {
      current.minutes += Number(line.minutes ?? 0);
    }
    if (
      current.sourceLineId === null ||
      ['BASE_PAY', 'SUPPLEMENT'].includes(line.lineType)
    ) {
      current.sourceLineId = line.id ?? current.sourceLineId;
    }
    current.sourcePayRateVersionId ??= line.basePayRateVersionId;
    current.sourcePayRuleVersionId ??= line.payRuleVersionId;
    grouped.set(line.timeEntryId, current);
  }

  for (const value of grouped.values()) {
    value.amount = roundedMoney(value.amount);
  }
  return grouped;
}

function adjustmentType(changeType: string): MoneyAdjustmentType {
  if (changeType === 'PAY_RATE') return 'PAY_RATE_CHANGE';
  if (changeType === 'PAY_RULE' || changeType === 'SPECIAL_DAY') return 'PAY_RULE_CHANGE';
  return 'PAYROLL_MODE_CHANGE';
}

function exportCategory(employmentType: string | null | undefined) {
  if (employmentType === 'SALARIED') return 'SALARIED' as const;
  if (employmentType === 'VOLUNTEER') return 'VOLUNTEER' as const;
  return 'HOURLY' as const;
}

@Injectable()
export class PayrollRetroactiveAdjustmentService {
  async createForConfigurationChange(
    prisma: Prisma.TransactionClient,
    params: {
      changeId: number;
      cinemaId: number;
      closedPeriodIds: number[];
      createdByUserId: number;
      reason: string | null;
    },
  ) {
    if (params.closedPeriodIds.length === 0) {
      return { createdCount: 0, totalAmountDelta: 0 };
    }

    const change = await prisma.payrollConfigurationChange.findFirst({
      where: { id: params.changeId, cinemaId: params.cinemaId },
      select: { id: true, type: true, validFrom: true },
    });
    if (!change) return { createdCount: 0, totalAmountDelta: 0 };

    let createdCount = 0;
    let totalAmountDelta = 0;

    for (const periodId of params.closedPeriodIds) {
      const period = await prisma.payrollPeriod.findFirst({
        where: {
          id: periodId,
          cinemaId: params.cinemaId,
          status: { in: ['LOCKED', 'EXPORTED'] },
          lockedCalculationRunId: { not: null },
        },
        include: {
          lockedCalculationRun: {
            include: {
              lines: { orderBy: [{ segmentStart: 'asc' }, { id: 'asc' }] },
            },
          },
        },
      });
      if (!period?.lockedCalculationRun) continue;

      const recalculated = await calculatePayrollPeriod(prisma, {
        cinemaId: params.cinemaId,
        startDate: dateKey(period.startDate),
        endDate: dateKey(period.endDate),
      });
      const originalByEntry = groupCalculationLines(
        period.lockedCalculationRun.lines as CalculationLineLike[],
      );
      const recalculatedByEntry = groupCalculationLines(
        recalculated.lines as CalculationLineLike[],
      );
      const entryIds = Array.from(
        new Set([...originalByEntry.keys(), ...recalculatedByEntry.keys()]),
      );
      if (entryIds.length === 0) continue;

      const [entries, earlierAdjustments] = await Promise.all([
        prisma.timeEntry.findMany({
          where: { id: { in: entryIds }, cinemaId: params.cinemaId },
          select: {
            id: true,
            userId: true,
            clockIn: true,
            clockOut: true,
            payrollTypeId: true,
            user: {
              select: {
                cinemaMemberships: {
                  where: { cinemaId: params.cinemaId },
                  select: { id: true, employmentType: true },
                  take: 1,
                },
              },
            },
          },
        }),
        prisma.payrollAdjustment.findMany({
          where: {
            originalPayrollPeriodId: period.id,
            timeEntryId: { in: entryIds },
            status: { not: 'VOIDED' },
            type: { in: [...MONEY_ADJUSTMENT_TYPES] },
          },
          select: {
            timeEntryId: true,
            amountDelta: true,
            payrollConfigurationChangeId: true,
          },
        }),
      ]);
      const entryById = new Map(entries.map((entry) => [entry.id, entry]));
      const alreadyAdjusted = new Map<number, number>();
      const alreadyCreatedForChange = new Set<number>();
      for (const adjustment of earlierAdjustments) {
        alreadyAdjusted.set(
          adjustment.timeEntryId,
          roundedMoney(
            (alreadyAdjusted.get(adjustment.timeEntryId) ?? 0) +
              money(adjustment.amountDelta),
          ),
        );
        if (adjustment.payrollConfigurationChangeId === change.id) {
          alreadyCreatedForChange.add(adjustment.timeEntryId);
        }
      }

      for (const timeEntryId of entryIds) {
        if (alreadyCreatedForChange.has(timeEntryId)) continue;
        const duplicate = await prisma.payrollAdjustment.findFirst({
          where: {
            payrollConfigurationChangeId: change.id,
            timeEntryId,
            status: { not: 'VOIDED' },
          },
          select: { id: true },
        });
        if (duplicate) continue;

        const entry = entryById.get(timeEntryId);
        if (!entry) continue;
        const original = originalByEntry.get(timeEntryId);
        const corrected = recalculatedByEntry.get(timeEntryId);
        const originalAmount = original?.amount ?? 0;
        const correctedAmount = corrected?.amount ?? 0;
        const amountDelta = roundedMoney(
          correctedAmount -
            originalAmount -
            (alreadyAdjusted.get(timeEntryId) ?? 0),
        );
        if (Math.abs(amountDelta) < 0.005) continue;

        const source = original ?? corrected;
        if (!source) continue;
        const membership = entry.user.cinemaMemberships[0];
        const minutes = Math.round(original?.minutes ?? corrected?.minutes ?? 0);
        const created = await prisma.payrollAdjustment.create({
          data: {
            cinemaId: params.cinemaId,
            userId: entry.userId,
            timeEntryId,
            originalPayrollPeriodId: period.id,
            settlementPayrollPeriodId: null,
            payrollTypeId: source.payrollTypeId ?? entry.payrollTypeId ?? null,
            type: adjustmentType(change.type),
            status: 'PENDING',
            exportCategory: exportCategory(membership?.employmentType),
            minutesDelta: 0,
            exportedMinutes: minutes,
            adjustedMinutes: minutes,
            amountDelta: amountDelta.toFixed(2),
            exportedAmount: originalAmount.toFixed(2),
            adjustedAmount: correctedAmount.toFixed(2),
            currencyCode: 'DKK',
            previousMinutes: minutes,
            newMinutes: minutes,
            previousClockIn: entry.clockIn,
            previousClockOut: entry.clockOut,
            newClockIn: entry.clockIn,
            newClockOut: entry.clockOut,
            sourceCalculationRunId: period.lockedCalculationRun.id,
            sourceCalculationLineId: original?.sourceLineId ?? null,
            sourcePayRateVersionId: original?.sourcePayRateVersionId ?? null,
            sourcePayRuleVersionId: original?.sourcePayRuleVersionId ?? null,
            payrollConfigurationChangeId: change.id,
            reason:
              params.reason ??
              'Automatisk efterregulering efter ændring af lønopsætningen.',
            createdByUserId: params.createdByUserId,
            metadata: {
              validFrom: change.validFrom.toISOString(),
              sourceChecksum: period.lockedCalculationRun.checksum,
              correctedChecksum: recalculated.checksum,
              previousAdjustmentAmount: alreadyAdjusted.get(timeEntryId) ?? 0,
            },
          },
        });
        await prisma.payrollAdjustmentRevision.create({
          data: {
            payrollAdjustmentId: created.id,
            changedByUserId: params.createdByUserId,
            action: 'CREATED',
            previousStatus: null,
            newStatus: 'PENDING',
            previousExportedMinutes: null,
            newExportedMinutes: minutes,
            previousAdjustedMinutes: null,
            newAdjustedMinutes: minutes,
            previousMinutesDelta: null,
            newMinutesDelta: 0,
            previousOriginalPayrollPeriodId: null,
            newOriginalPayrollPeriodId: period.id,
            previousSettlementPayrollPeriodId: null,
            newSettlementPayrollPeriodId: null,
            reason:
              params.reason ??
              'Automatisk efterregulering efter ændring af lønopsætningen.',
          },
        });
        createdCount += 1;
        totalAmountDelta = roundedMoney(totalAmountDelta + amountDelta);
      }
    }

    return { createdCount, totalAmountDelta };
  }
}
