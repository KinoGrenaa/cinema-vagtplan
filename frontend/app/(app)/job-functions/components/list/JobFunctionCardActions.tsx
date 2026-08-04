import type { JobFunctionWithJobFunction } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionCardActionsProps = {
  jobFunction: JobFunctionWithJobFunction;
  isExpanded: boolean;
  onArchive: (jobFunction: JobFunctionWithJobFunction) => void;
  onCopy: (jobFunction: JobFunctionWithJobFunction) => void;
  onEdit: (jobFunction: JobFunctionWithJobFunction) => void;
  onOpenEmployees: (jobFunction: JobFunctionWithJobFunction) => void;
  onOpenTimingRule: (jobFunction: JobFunctionWithJobFunction) => void;
  onReactivate: (jobFunction: JobFunctionWithJobFunction) => void;
  onToggleDetails: (jobFunctionId: number) => void;
};

export default function JobFunctionCardActions({
  jobFunction,
  isExpanded,
  onArchive,
  onCopy,
  onEdit,
  onOpenEmployees,
  onOpenTimingRule,
  onReactivate,
  onToggleDetails,
}: JobFunctionCardActionsProps) {
  return (
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
      <button
        type="button"
        onClick={() => onCopy(jobFunction)}
        className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:border-teal-900 dark:text-teal-200 dark:hover:bg-teal-950"
      >
        Kopiér
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
  );
}
