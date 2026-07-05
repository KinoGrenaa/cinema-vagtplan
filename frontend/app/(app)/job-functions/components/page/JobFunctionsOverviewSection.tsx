import JobFunctionsList from "../list/JobFunctionsList";
import type {
  JobFunctionWithWorkType,
  MissingPayrollTypeWarningData,
} from "../../helpers/jobFunctionPayrollHelpers";

type JobFunctionsOverviewSectionProps = {
  activeCount: number;
  archivedCount: number;
  expandedJobFunctionIds: ReadonlySet<number>;
  jobFunctions: JobFunctionWithWorkType[];
  loading: boolean;
  missingPayrollTypeWarning: MissingPayrollTypeWarningData;
  showArchived: boolean;
  onArchive: (jobFunction: JobFunctionWithWorkType) => void;
  onCreate: () => void;
  onEdit: (jobFunction: JobFunctionWithWorkType) => void;
  onOpenEmployees: (jobFunction: JobFunctionWithWorkType) => void;
  onOpenTimingRule: (jobFunction: JobFunctionWithWorkType) => void;
  onReactivate: (jobFunction: JobFunctionWithWorkType) => void;
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
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Opret jobfunktion
          </button>
          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => onShowArchivedChange(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Vis arkiverede
          </label>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
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
        onEdit={onEdit}
        onOpenEmployees={onOpenEmployees}
        onOpenTimingRule={onOpenTimingRule}
        onReactivate={onReactivate}
        onToggleDetails={onToggleDetails}
      />
    </section>
  );
}
