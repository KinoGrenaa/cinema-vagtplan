import type {
  JobFunction,
  PayrollExportCode,
} from "../types/jobFunctionTypes";

export type PayrollTypeOption = PayrollExportCode;
export type JobFunctionWithJobFunction = JobFunction;

export type MissingPayrollTypeWarningData = {
  count: number;
  names: string;
  remainingCount: number;
  visible: boolean;
};

export function isMissingPayrollType(
  jobFunction: JobFunction | null | undefined,
) {
  return !jobFunction?.defaultPayrollExportCode?.id &&
    !jobFunction?.defaultPayrollExportCodeId;
}

export function formatPayrollType(
  jobFunction: JobFunction | null | undefined,
) {
  if (!jobFunction || isMissingPayrollType(jobFunction)) {
    return "Ingen eksportkode";
  }

  return jobFunction.defaultPayrollExportCode?.name ?? "Eksportkode valgt";
}

export function getMissingPayrollTypeWarningData(
  jobFunctions: JobFunction[],
  loading: boolean,
): MissingPayrollTypeWarningData {
  const missing = jobFunctions.filter(
    (jobFunction) => jobFunction.isActive && isMissingPayrollType(jobFunction),
  );
  const count = missing.length;
  const names = missing
    .slice(0, 3)
    .map((jobFunction) => jobFunction.name)
    .join(", ");

  return {
    count,
    names,
    remainingCount: Math.max(count - 3, 0),
    visible: !loading && count > 0,
  };
}
