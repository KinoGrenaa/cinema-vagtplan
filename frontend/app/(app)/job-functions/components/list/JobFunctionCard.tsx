import {
  formatDayPeriod,
  formatTimingRuleSummary,
  getJobFunctionEmployeeCount,
} from "../../helpers/page/jobFunctionHelpers";
import {
  formatPayrollType,
  isMissingPayrollType,
} from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { JobFunctionWithWorkType } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionCardProps = {
  jobFunction: JobFunctionWithWorkType;
  isExpanded: boolean;
  onArchive: (jobFunction: JobFunctionWithWorkType) => void;
  onEdit: (jobFunction: JobFunctionWithWorkType) => void;
  onOpenEmployees: (jobFunction: JobFunctionWithWorkType) => void;
  onOpenTimingRule: (jobFunction: JobFunctionWithWorkType) => void;
  onReactivate: (jobFunction: JobFunctionWithWorkType) => void;
  onToggleDetails: (jobFunctionId: number) => void;
};

export default function JobFunctionCard({
  jobFunction,
  isExpanded,
  onArchive,
  onEdit,
  onOpenEmployees,
  onOpenTimingRule,
  onReactivate,
  onToggleDetails,
}: JobFunctionCardProps) {
  const employeeCount = getJobFunctionEmployeeCount(jobFunction);
  const hasMissingPayrollType =
    jobFunction.isActive && isMissingPayrollType(jobFunction.workType);

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
                  Mangler løntype
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => onToggleDetails(jobFunction.id)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-white dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {isExpanded ? "Skjul detaljer" : "Vis detaljer"}
            </button>
            <button
              type="button"
              onClick={() => onOpenTimingRule(jobFunction)}
              className="rounded-xl border border-purple-200 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-200 dark:hover:bg-purple-950"
            >
              Tidsregel
            </button>
            <button
              type="button"
              onClick={() => onOpenEmployees(jobFunction)}
              className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-200 dark:hover:bg-blue-950"
            >
              Medarbejdere
            </button>
            {jobFunction.isActive && (
              <button
                type="button"
                onClick={() => onEdit(jobFunction)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-white dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Redigér
              </button>
            )}
            {jobFunction.isActive ? (
              <button
                type="button"
                onClick={() => onArchive(jobFunction)}
                className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Arkivér
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onReactivate(jobFunction)}
                className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Genaktivér
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            {jobFunction.description && (
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                {jobFunction.description}
              </p>
            )}

            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <div className="min-w-0 xl:col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">
                  Dagsperiode
                </dt>
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
                <dt className="text-gray-500 dark:text-gray-400">
                  Oprettes som
                </dt>
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
        )}
      </div>
    </li>
  );
}
