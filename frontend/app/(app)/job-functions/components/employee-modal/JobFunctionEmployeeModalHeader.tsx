import type { JobFunctionWithWorkType } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionEmployeeModalHeaderProps = {
  assignmentSaving: boolean;
  jobFunction: JobFunctionWithWorkType;
  onClose: () => void;
};

export default function JobFunctionEmployeeModalHeader({
  assignmentSaving,
  jobFunction,
  onClose,
}: JobFunctionEmployeeModalHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Medarbejdere
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
          {jobFunction.name}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Vælg hvilke medarbejdere der kan bemande denne jobfunktion. Dette
          styrer kompetence/egnethed og ikke løn.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
        disabled={assignmentSaving}
      >
        Luk
      </button>
    </div>
  );
}
