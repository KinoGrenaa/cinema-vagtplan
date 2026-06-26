import type {
  PayrollSegmentDefinition,
  SegmentResolutionInput,
} from './payroll-rule-types';

export function resolvePayrollSegment(
  input: SegmentResolutionInput,
): PayrollSegmentDefinition {
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
