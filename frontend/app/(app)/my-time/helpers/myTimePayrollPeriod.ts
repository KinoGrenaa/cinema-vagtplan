import { addDays, dateToLocalDateString } from "./myTimeDate";

type MyTimePayrollPeriod = {
  startDate: string;
  endDate: string;
};

export function getInitialPayrollPeriod() {
  const today = getCurrentPayrollPeriodReferenceDate();

  return {
    startDate: today,
    endDate: today,
  };
}

export function getCurrentPayrollPeriodReferenceDate() {
  return dateToLocalDateString(new Date());
}

export function getPreviousPayrollPeriodReferenceDate(
  payrollPeriod: MyTimePayrollPeriod,
) {
  return dateToLocalDateString(
    addDays(new Date(`${payrollPeriod.startDate}T00:00:00`), -1),
  );
}

export function getNextPayrollPeriodReferenceDate(
  payrollPeriod: MyTimePayrollPeriod,
) {
  return dateToLocalDateString(
    addDays(new Date(`${payrollPeriod.endDate}T00:00:00`), 1),
  );
}
