import {
  formatFilmWindow,
  formatTimingRuleSummary,
  getJobFunctionEmployeeCount,
} from "../../helpers/page/jobFunctionHelpers";
import { formatPayrollType } from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { JobFunctionWithJobFunction } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type Props = { jobFunction: JobFunctionWithJobFunction };

export default function JobFunctionCardDetails({ jobFunction }: Props) {
  return (
    <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
      {jobFunction.description && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{jobFunction.description}</p>
      )}
      <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-gray-500 dark:text-gray-400">Film der medregnes</dt><dd className="mt-1 font-medium">{formatFilmWindow(jobFunction.timingRule)}</dd></div>
        <div className="lg:col-span-2"><dt className="text-gray-500 dark:text-gray-400">Tidsregel</dt><dd className="mt-1 font-medium">{formatTimingRuleSummary(jobFunction.timingRule)}</dd></div>
        <div><dt className="text-gray-500 dark:text-gray-400">Eksportkode</dt><dd className="mt-1 font-medium">{formatPayrollType(jobFunction)}</dd></div>
        <div><dt className="text-gray-500 dark:text-gray-400">Sortering</dt><dd className="mt-1 font-medium">{jobFunction.sortOrder}</dd></div>
        <div><dt className="text-gray-500 dark:text-gray-400">Medarbejdere</dt><dd className="mt-1 font-medium">{getJobFunctionEmployeeCount(jobFunction)}</dd></div>
        <div><dt className="text-gray-500 dark:text-gray-400">Historiske/planlagte vagter</dt><dd className="mt-1 font-medium">{jobFunction._count?.shifts ?? 0}</dd></div>
      </dl>
    </div>
  );
}
