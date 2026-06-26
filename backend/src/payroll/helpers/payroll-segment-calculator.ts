import type { EmploymentType, PayrollSegment } from './payroll-rule-types';
import { mergeAdjacentPayrollSegments } from './payroll-segment-merger';
import { resolvePayrollSegment } from './payroll-segment-resolver';

export function calculatePayrollSegments(timeEntry: any): PayrollSegment[] {
  if (!timeEntry.clockIn || !timeEntry.clockOut) {
    return [];
  }

  const start = new Date(timeEntry.clockIn);
  const end = new Date(timeEntry.clockOut);

  if (end <= start) {
    return [];
  }

  const cinema = timeEntry.cinema || {};
  const shift = timeEntry.shift;

  const employmentType: EmploymentType =
    timeEntry.user?.employmentType || 'HOURLY';

  const overtimeEnabled = Boolean(cinema.payrollOvertimeEnabled);

  const plannedOvertimeEnabled = Boolean(cinema.plannedOvertimeEnabled);

  const dailyOvertimeEnabled = Boolean(cinema.dailyOvertimeEnabled);

  const dailyOvertimeThreshold = Number(cinema.dailyOvertimeThreshold) || 8;

  const workTypePayroll =
    timeEntry.payrollType || timeEntry.shift?.workType?.payrollType;

  const normalPayrollCode = workTypePayroll?.payrollCode || 'STANDARD';

  const normalExportCode = workTypePayroll?.exportCode || normalPayrollCode;

  const normalPayrollName = workTypePayroll?.name || 'Standard';

  const segments: PayrollSegment[] = [];

  let current = new Date(start);
  let workedHoursSoFar = 0;

  while (current < end) {
    const next = new Date(current);
    next.setHours(next.getHours() + 1);

    if (next > end) {
      next.setTime(end.getTime());
    }

    const hours = (next.getTime() - current.getTime()) / 1000 / 60 / 60;

    const isPlannedOvertime =
      overtimeEnabled &&
      plannedOvertimeEnabled &&
      shift?.endTime &&
      current >= new Date(shift.endTime);

    const isDailyOvertime =
      overtimeEnabled &&
      dailyOvertimeEnabled &&
      workedHoursSoFar >= dailyOvertimeThreshold;

    const isOvertime = isPlannedOvertime || isDailyOvertime;

    const hour = current.getHours();
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const isNight = hour >= 22 || hour < 6;
    const isEvening = !isNight && hour >= 18 && hour < 22;

    const segment = resolvePayrollSegment({
      isWeekend,
      isNight,
      isEvening,
      isOvertime,
      normalPayrollCode,
      normalExportCode,
      normalPayrollName,
    });

    const isStandardSegment =
      segment.payrollCode === normalPayrollCode &&
      segment.exportCode === normalExportCode &&
      segment.payrollName === normalPayrollName;

    if (!(employmentType === 'SALARIED' && isStandardSegment)) {
      segments.push({
        start: new Date(current),
        end: new Date(next),
        hours: Number(hours.toFixed(2)),
        payrollCode: segment.payrollCode,
        exportCode: segment.exportCode,
        payrollName: segment.payrollName,
      });
    }

    workedHoursSoFar += hours;
    current = next;
  }

  return mergeAdjacentPayrollSegments(segments);
}
