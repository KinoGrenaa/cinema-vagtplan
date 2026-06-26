export type EmploymentType = 'HOURLY' | 'SALARIED';

export type PayrollSegment = {
  start: Date;
  end: Date;
  hours: number;
  payrollCode: string;
  exportCode: string;
  payrollName: string;
};

export type PayrollSegmentDefinition = Pick<
  PayrollSegment,
  'payrollCode' | 'exportCode' | 'payrollName'
>;

export type SegmentResolutionInput = {
  isWeekend: boolean;
  isNight: boolean;
  isEvening: boolean;
  isOvertime: boolean;
  normalPayrollCode: string;
  normalExportCode: string;
  normalPayrollName: string;
};
