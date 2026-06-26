import type { PayrollSegment } from './payroll-rule-types';

export function mergeAdjacentPayrollSegments(
  segments: PayrollSegment[],
): PayrollSegment[] {
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
