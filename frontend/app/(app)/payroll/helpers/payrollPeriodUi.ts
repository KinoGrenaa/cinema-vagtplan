export type PayrollPeriodUiStatus =
  | "OPEN"
  | "LOCKED"
  | "EXPORTED"
  | "UNLOCKED";

function formatIsoDateDK(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return value;

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

export function formatPayrollPeriodDateRange(
  startDate: string,
  endDate: string,
) {
  return `${formatIsoDateDK(startDate)} – ${formatIsoDateDK(endDate)}`;
}

export function resolvePayrollPeriodStatus(
  status: PayrollPeriodUiStatus | null | undefined,
  periodLoading: boolean,
  periodLoadFailed = false,
): PayrollPeriodUiStatus | null {
  if (periodLoading || periodLoadFailed) return null;

  return status ?? "OPEN";
}

export function isPayrollReportReady(
  reportLoading: boolean,
  reportLoadFailed: boolean,
) {
  return !reportLoading && !reportLoadFailed;
}

export function formatPayrollPeriodDialogDateRange(
  startDate: string,
  endDate: string,
) {
  return formatPayrollPeriodDateRange(
    startDate,
    endDate,
  ).replaceAll(" ", "\u00a0");
}
