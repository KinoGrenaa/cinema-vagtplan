import type { JobFunction } from "../types/jobFunctionTypes";

export type PayrollTypeOption = {
  id: number;
  name: string;
  payrollCode?: string | null;
  exportCode?: string | null;
  description?: string | null;
  color?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
};

export type WorkType = {
  id: number;
  name: string;
  color?: string | null;
  isActive?: boolean;
  payrollTypeId?: number | null;
  payrollType?: PayrollTypeOption | null;
};

export type JobFunctionWithWorkType = JobFunction & {
  workTypeId?: number | null;
  workType?: WorkType | null;
};

export type MissingPayrollTypeWarningData = {
  count: number;
  names: string;
  remainingCount: number;
  visible: boolean;
};

export function isMissingPayrollType(workType: WorkType | null | undefined) {
  return !workType?.payrollType?.id && !workType?.payrollTypeId;
}

export function formatPayrollType(workType: WorkType | null | undefined) {
  if (!workType) {
    return "Mangler løntype";
  }

  if (isMissingPayrollType(workType)) {
    return "Mangler løntype";
  }

  return workType.payrollType?.name ?? workType.name;
}

export function getMissingPayrollTypeWarningData(
  jobFunctions: JobFunctionWithWorkType[],
  loading: boolean,
): MissingPayrollTypeWarningData {
  const missingPayrollTypeJobFunctions = jobFunctions.filter(
    (jobFunction) =>
      jobFunction.isActive && isMissingPayrollType(jobFunction.workType),
  );
  const count = missingPayrollTypeJobFunctions.length;
  const names = missingPayrollTypeJobFunctions
    .slice(0, 3)
    .map((jobFunction) => jobFunction.name)
    .join(", ");
  const remainingCount = Math.max(count - 3, 0);

  return {
    count,
    names,
    remainingCount,
    visible: !loading && count > 0,
  };
}
