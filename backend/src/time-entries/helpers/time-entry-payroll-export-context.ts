type PayrollPeriodContext = {
  id: number;
  status: string;
  startDate: Date;
  endDate: Date;
};

type PayrollAdjustmentContext = {
  id: number;
  type: string;
  status: string;
  minutesDelta: number;
  exportedMinutes: number;
  adjustedMinutes: number;
  previousMinutes?:
    number | null;
  newMinutes?:
    number | null;
  reason: string;
  createdAt: Date;
  includedAt?: Date | null;
  originalPayrollPeriod?:
    PayrollPeriodContext | null;
  settlementPayrollPeriod?:
    PayrollPeriodContext | null;
  createdByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

function toPeriodSummary(
  period:
    | PayrollPeriodContext
    | null
    | undefined,
) {
  if (!period) {
    return null;
  }

  return {
    id: period.id,
    startDate: period.startDate,
    endDate: period.endDate,
  };
}

function findExportedPeriod(
  periods: Array<
    PayrollPeriodContext |
    null |
    undefined
  >,
) {
  return periods.find(
    (period) =>
      period?.status === 'EXPORTED',
  ) ?? null;
}

function toAdjustmentHistoryItem(
  adjustment:
    PayrollAdjustmentContext,
) {
  return {
    id: adjustment.id,
    type: adjustment.type,
    status: adjustment.status,
    minutesDelta:
      adjustment.minutesDelta,
    exportedMinutes:
      adjustment.exportedMinutes,
    adjustedMinutes:
      adjustment.adjustedMinutes,
    previousMinutes:
      adjustment.previousMinutes ??
      null,
    newMinutes:
      adjustment.newMinutes ??
      null,
    reason: adjustment.reason,
    createdAt:
      adjustment.createdAt,
    includedAt:
      adjustment.includedAt ??
      null,
    originalPayrollPeriod:
      toPeriodSummary(
        adjustment
          .originalPayrollPeriod,
      ),
    settlementPayrollPeriod:
      toPeriodSummary(
        adjustment
          .settlementPayrollPeriod,
      ),
    createdByUser:
      adjustment.createdByUser ??
      null,
  };
}

export function withTimeEntryPayrollExportContext<
  T extends Record<string, any>,
>(entry: T) {
  const adjustmentHistory =
    (
      Array.isArray(
        entry.payrollAdjustments,
      )
        ? entry.payrollAdjustments
        : []
    ) as PayrollAdjustmentContext[];

  const pendingAdjustments =
    adjustmentHistory.filter(
      (adjustment) =>
        adjustment.status ===
        'PENDING',
    );

  const newestAdjustment =
    pendingAdjustments[0] ??
    adjustmentHistory[0];

  const originalPayrollPeriod =
    findExportedPeriod([
      newestAdjustment
        ?.originalPayrollPeriod,
      entry.payrollPeriod,
      entry.originalPayrollPeriod,
    ]);

  const baseEntry = {
    ...entry,
    payrollAdjustments:
      pendingAdjustments,
    payrollAdjustmentHistory:
      adjustmentHistory.map(
        toAdjustmentHistoryItem,
      ),
  };

  if (!originalPayrollPeriod) {
    return {
      ...baseEntry,
      payrollExportContext: null,
    };
  }

  const adjustmentPayrollPeriod =
    newestAdjustment
      ?.settlementPayrollPeriod ??
    entry.adjustmentPayrollPeriod ??
    null;

  return {
    ...baseEntry,
    payrollExportContext: {
      originalPayrollPeriod:
        toPeriodSummary(
          originalPayrollPeriod,
        ),
      adjustmentPayrollPeriod:
        toPeriodSummary(
          adjustmentPayrollPeriod,
        ),
      hasPendingAdjustment:
        pendingAdjustments.length > 0,
      requiresConfirmation: true,
    },
  };
}
