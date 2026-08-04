function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type CalculationLine = {
  timeEntryId?: number | null;
  lineType: string;
  roundedAmount: unknown;
  minutes: number;
  membership?: { userId: number } | null;
};

export function addPayrollCalculationToReport(
  report: any,
  calculation: any,
  options: { useSnapshotAdjustments?: boolean } = {},
) {
  const byEntry = new Map<
    number,
    { basePayAmount: number; supplementAmount: number; calculatedAmount: number }
  >();
  const adjustmentByUser = new Map<number, number>();

  for (const line of (calculation?.lines ?? []) as CalculationLine[]) {
    const amount = numberValue(line.roundedAmount);
    if (line.lineType === 'ADJUSTMENT') {
      const userId = line.membership?.userId;
      if (userId) {
        adjustmentByUser.set(
          userId,
          (adjustmentByUser.get(userId) ?? 0) + amount,
        );
      }
      continue;
    }
    if (!line.timeEntryId) continue;
    const totals = byEntry.get(line.timeEntryId) ?? {
      basePayAmount: 0,
      supplementAmount: 0,
      calculatedAmount: 0,
    };
    if (line.lineType === 'BASE_PAY') totals.basePayAmount += amount;
    if (line.lineType === 'SUPPLEMENT') totals.supplementAmount += amount;
    totals.calculatedAmount += amount;
    byEntry.set(line.timeEntryId, totals);
  }

  let reportBasePayAmount = 0;
  let reportSupplementAmount = 0;
  let reportAdjustmentAmount = 0;

  const employees = (report.employees ?? []).map((employee: any) => {
    let basePayAmount = 0;
    let supplementAmount = 0;
    const entries = (employee.entries ?? []).map((entry: any) => {
      const totals = byEntry.get(entry.id) ?? {
        basePayAmount: 0,
        supplementAmount: 0,
        calculatedAmount: 0,
      };
      basePayAmount += totals.basePayAmount;
      supplementAmount += totals.supplementAmount;
      return {
        ...entry,
        basePayAmount: money(totals.basePayAmount),
        supplementAmount: money(totals.supplementAmount),
        calculatedAmount: money(totals.calculatedAmount),
      };
    });
    const liveAdjustmentAmount = money(
      (employee.payrollAdjustments ?? []).reduce(
        (sum: number, adjustment: any) =>
          sum + numberValue(adjustment.amountDelta),
        0,
      ),
    );
    const adjustmentAmount = options.useSnapshotAdjustments
      ? money(adjustmentByUser.get(employee.userId) ?? 0)
      : liveAdjustmentAmount;
    basePayAmount = money(basePayAmount);
    supplementAmount = money(supplementAmount);
    reportBasePayAmount += basePayAmount;
    reportSupplementAmount += supplementAmount;
    reportAdjustmentAmount += adjustmentAmount;
    return {
      ...employee,
      entries,
      basePayAmount,
      supplementAmount,
      adjustmentAmount,
      totalAmount: money(basePayAmount + supplementAmount + adjustmentAmount),
    };
  });

  return {
    ...report,
    employees,
    basePayAmount: money(reportBasePayAmount),
    supplementAmount: money(reportSupplementAmount),
    adjustmentAmount: money(reportAdjustmentAmount),
    totalAmount: money(
      reportBasePayAmount + reportSupplementAmount + reportAdjustmentAmount,
    ),
  };
}
