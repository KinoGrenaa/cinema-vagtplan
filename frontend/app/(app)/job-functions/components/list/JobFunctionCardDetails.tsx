import {
  formatDayPeriod,
  formatTimingRuleSummary,
  getJobFunctionEmployeeCount,
} from "../../helpers/page/jobFunctionHelpers";
import { formatPayrollType } from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { JobFunctionWithWorkType } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionCardDetailsProps = {
  jobFunction: JobFunctionWithWorkType;
};

export default function JobFunctionCardDetails({
  jobFunction,
}: JobFunctionCardDetailsProps) {
  const employeeCount = getJobFunctionEmployeeCount(jobFunction);

  return (
    <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
      {jobFunction.description && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {jobFunction.description}
        </p>
      )}

      <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="min-w-0 xl:col-span-2">
          <dt className="text-gray-500 dark:text-gray-400">Dagsperiode</dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {formatDayPeriod(jobFunction.dayPeriod)}
          </dd>
        </div>
        <div className="min-w-0 lg:col-span-2 xl:col-span-2">
          <dt className="text-gray-500 dark:text-gray-400">Tidsregel</dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {formatTimingRuleSummary(jobFunction.timingRule)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-gray-500 dark:text-gray-400">Oprettes som</dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {formatPayrollType(jobFunction.workType)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Sortering</dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {jobFunction.sortOrder}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Medarbejdere</dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {employeeCount}
          </dd>
        </div>
      </dl>
    </div>
  );
}
