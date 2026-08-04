import JobFunctionsList from "../list/JobFunctionsList";

import type {
  JobFunctionWithJobFunction,
  MissingPayrollTypeWarningData,
} from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionsOverviewSectionProps = {
  activeCount: number;
  archivedCount: number;
  expandedJobFunctionIds: ReadonlySet<number>;
  jobFunctions: JobFunctionWithJobFunction[];
  loading: boolean;
  missingPayrollTypeWarning: MissingPayrollTypeWarningData;
  showArchived: boolean;
  onArchive: (jobFunction: JobFunctionWithJobFunction) => void;
  onCreate: () => void;
  onCopy: (jobFunction: JobFunctionWithJobFunction) => void;
  onEdit: (jobFunction: JobFunctionWithJobFunction) => void;
  onOpenEmployees: (jobFunction: JobFunctionWithJobFunction) => void;
  onOpenTimingRule: (jobFunction: JobFunctionWithJobFunction) => void;
  onReactivate: (jobFunction: JobFunctionWithJobFunction) => void;
  onRefresh: () => void;
  onShowArchivedChange: (showArchived: boolean) => void;
  onToggleDetails: (jobFunctionId: number) => void;
};

export default function JobFunctionsOverviewSection({
  activeCount,
  archivedCount,
  expandedJobFunctionIds,
  jobFunctions,
  loading,
  missingPayrollTypeWarning,
  showArchived,
  onArchive,
  onCreate,
  onCopy,
  onEdit,
  onOpenEmployees,
  onOpenTimingRule,
  onReactivate,
  onRefresh,
  onShowArchivedChange,
  onToggleDetails,
}: JobFunctionsOverviewSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Overblik
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
            Jobfunktioner
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {loading
              ? "Henter jobfunktioner..."
              : `${jobFunctions.length} jobfunktioner vist · ${activeCount} aktive${
                  showArchived ? ` · ${archivedCount} arkiverede` : ""
                }`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Opret jobfunktion
          </button>
          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => onShowArchivedChange(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-gray-600 dark:accent-blue-400 dark:focus-visible:ring-blue-400"
            />
            Vis arkiverede
          </label>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Opdater
          </button>
        </div>
      </div>
      <JobFunctionsList
        expandedJobFunctionIds={expandedJobFunctionIds}
        jobFunctions={jobFunctions}
        loading={loading}
        missingPayrollTypeWarning={missingPayrollTypeWarning}
        onArchive={onArchive}
        onCopy={onCopy}
        onEdit={onEdit}
        onOpenEmployees={onOpenEmployees}
        onOpenTimingRule={onOpenTimingRule}
        onReactivate={onReactivate}
        onToggleDetails={onToggleDetails}
      />
    </section>
  );
}
