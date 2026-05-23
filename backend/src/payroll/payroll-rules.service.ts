import { Injectable } from '@nestjs/common';

export type PayrollSegment = {
  start: Date;
  end: Date;
  hours: number;
  payrollCode: string;
  exportCode: string;
  payrollName: string;
};

@Injectable()
export class PayrollRulesService {
  calculateSegments(timeEntry: any): PayrollSegment[] {
    if (!timeEntry.clockIn || !timeEntry.clockOut) {
      return [];
    }

    const start = new Date(timeEntry.clockIn);
    const end = new Date(timeEntry.clockOut);

    const workTypePayroll =
      timeEntry.payrollType || timeEntry.shift?.workType?.payrollType;

    const normalPayrollCode = workTypePayroll?.payrollCode || 'STANDARD';
    const normalExportCode = workTypePayroll?.exportCode || normalPayrollCode;
    const normalPayrollName = workTypePayroll?.name || 'Standard';

    const segments: PayrollSegment[] = [];
    let current = new Date(start);

    while (current < end) {
      const next = new Date(current);
      next.setHours(next.getHours() + 1);

      if (next > end) {
        next.setTime(end.getTime());
      }

      const isWeekend = current.getDay() === 0 || current.getDay() === 6;

      const hour = current.getHours();

      const isNight = hour >= 22 || hour < 6;

      const isEvening = !isNight && hour >= 18 && hour < 22;

      const hours = (next.getTime() - current.getTime()) / 1000 / 60 / 60;

      segments.push({
        start: new Date(current),
        end: new Date(next),
        hours: Number(hours.toFixed(2)),
        payrollCode: isWeekend
          ? 'WEEKEND'
          : isNight
            ? 'NIGHT'
            : isEvening
              ? 'EVENING'
              : normalPayrollCode,

        exportCode: isWeekend
          ? 'WEEKEND'
          : isNight
            ? 'NIGHT'
            : isEvening
              ? 'EVENING'
              : normalExportCode,

        payrollName: isWeekend
          ? 'Weekend'
          : isNight
            ? 'Nat'
            : isEvening
              ? 'Aften'
              : normalPayrollName,
      });

      current = next;
    }

    return segments;
  }
}
