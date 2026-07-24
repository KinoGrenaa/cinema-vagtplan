type PayrollPeriodContext = {
  id: number;
  status: string;
  startDate: Date;
  endDate: Date;
};

type PayrollAdjustmentContext = {
  originalPayrollPeriod?:
    PayrollPeriodContext | null;
  settlementPayrollPeriod?:
    PayrollPeriodContext | null;
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

export function withTimeEntryPayrollExportContext<
  T extends Record<string, any>,
>(entry: T) {
  const pendingAdjustments =
    Array.isArray(
      entry.payrollAdjustments,
    )
      ? entry.payrollAdjustments
      : [];

  const newestAdjustment =
    pendingAdjustments[0] as
      | PayrollAdjustmentContext
      | undefined;

  const originalPayrollPeriod =
    findExportedPeriod([
      newestAdjustment
        ?.originalPayrollPeriod,
      entry.payrollPeriod,
      entry.originalPayrollPeriod,
    ]);

  if (!originalPayrollPeriod) {
    return {
      ...entry,
      payrollExportContext: null,
    };
  }

  const adjustmentPayrollPeriod =
    newestAdjustment
      ?.settlementPayrollPeriod ??
    entry.adjustmentPayrollPeriod ??
    null;

  return {
    ...entry,
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
