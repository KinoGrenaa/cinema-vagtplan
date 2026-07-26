export type MyTimePayrollPeriod = {
  startDate: string;
  endDate: string;
};

export const MY_TIME_PAYROLL_PERIOD_CHANGED =
  "myTimePayrollPeriodChanged";

export function announceMyTimePayrollPeriod(
  period:
    MyTimePayrollPeriod,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<MyTimePayrollPeriod>(
      MY_TIME_PAYROLL_PERIOD_CHANGED,
      {
        detail: period,
      },
    ),
  );
}

export function readMyTimePayrollPeriodEvent(
  event: Event,
) {
  const detail =
    (
      event as
        CustomEvent<
          Partial<MyTimePayrollPeriod>
        >
    ).detail;

  if (
    typeof detail?.startDate !==
      "string" ||
    typeof detail?.endDate !==
      "string"
  ) {
    return null;
  }

  return {
    startDate:
      detail.startDate.slice(
        0,
        10,
      ),
    endDate:
      detail.endDate.slice(
        0,
        10,
      ),
  };
}
