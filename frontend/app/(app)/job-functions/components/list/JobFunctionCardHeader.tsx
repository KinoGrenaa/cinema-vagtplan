import { isMissingPayrollType } from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { JobFunctionWithJobFunction } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionCardHeaderProps = {
  jobFunction: JobFunctionWithJobFunction;
};

export default function JobFunctionCardHeader({
  jobFunction,
}: JobFunctionCardHeaderProps) {
  const hasMissingPayrollType =
    jobFunction.isActive && isMissingPayrollType(jobFunction);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="h-4 w-4 rounded-full border border-white shadow"
          style={{ backgroundColor: jobFunction.color }}
        />
        <h3 className="text-lg font-bold text-gray-950 dark:text-white">
          {jobFunction.name}
        </h3>
        <span
          className={
            jobFunction.isActive
              ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-200"
              : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }
        >
          {jobFunction.isActive ? "Aktiv" : "Arkiveret"}
        </span>
        {hasMissingPayrollType && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-100">
            Ingen eksportkode
          </span>
        )}
      </div>
    </div>
  );
}
