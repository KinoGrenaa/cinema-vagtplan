import { Injectable } from '@nestjs/common';

export type EmploymentType = 'HOURLY' | 'SALARIED';

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

      const segment = this.resolveSegment({
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

    return this.mergeAdjacentSegments(segments);
  }

  private resolveSegment(input: {
    isWeekend: boolean;
    isNight: boolean;
    isEvening: boolean;
    isOvertime: boolean;
    normalPayrollCode: string;
    normalExportCode: string;
    normalPayrollName: string;
  }) {
    if (input.isOvertime && input.isWeekend) {
      return {
        payrollCode: 'WEEKEND_OVERTIME',
        exportCode: 'WEEKEND_OVERTIME',
        payrollName: 'Weekend overtid',
      };
    }

    if (input.isOvertime && input.isNight) {
      return {
        payrollCode: 'NIGHT_OVERTIME',
        exportCode: 'NIGHT_OVERTIME',
        payrollName: 'Nat overtid',
      };
    }

    if (input.isOvertime && input.isEvening) {
      return {
        payrollCode: 'EVENING_OVERTIME',
        exportCode: 'EVENING_OVERTIME',
        payrollName: 'Aften overtid',
      };
    }

    if (input.isOvertime) {
      return {
        payrollCode: 'OVERTIME',
        exportCode: 'OVERTIME',
        payrollName: 'Overtid',
      };
    }

    if (input.isWeekend) {
      return {
        payrollCode: 'WEEKEND',
        exportCode: 'WEEKEND',
        payrollName: 'Weekend',
      };
    }

    if (input.isNight) {
      return {
        payrollCode: 'NIGHT',
        exportCode: 'NIGHT',
        payrollName: 'Nat',
      };
    }

    if (input.isEvening) {
      return {
        payrollCode: 'EVENING',
        exportCode: 'EVENING',
        payrollName: 'Aften',
      };
    }

    return {
      payrollCode: input.normalPayrollCode,
      exportCode: input.normalExportCode,
      payrollName: input.normalPayrollName,
    };
  }

  private mergeAdjacentSegments(segments: PayrollSegment[]): PayrollSegment[] {
    const merged: PayrollSegment[] = [];

    for (const segment of segments) {
      const last = merged[merged.length - 1];

      if (
        last &&
        last.end.getTime() === segment.start.getTime() &&
        last.payrollCode === segment.payrollCode &&
        last.exportCode === segment.exportCode &&
        last.payrollName === segment.payrollName
      ) {
        last.end = segment.end;
        last.hours = Number((last.hours + segment.hours).toFixed(2));
        continue;
      }

      merged.push({ ...segment });
    }

    return merged;
  }
}
