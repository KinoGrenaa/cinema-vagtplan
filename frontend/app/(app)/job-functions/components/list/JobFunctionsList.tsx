import JobFunctionCard from "./JobFunctionCard";
import JobFunctionMissingPayrollWarning from "./JobFunctionMissingPayrollWarning";
import type {
  JobFunctionWithJobFunction,
  MissingPayrollTypeWarningData,
} from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionsListProps = {
  expandedJobFunctionIds: ReadonlySet<number>;
  jobFunctions: JobFunctionWithJobFunction[];
  loading: boolean;
  missingPayrollTypeWarning: MissingPayrollTypeWarningData;
  onArchive: (jobFunction: JobFunctionWithJobFunction) => void;
  onCopy: (jobFunction: JobFunctionWithJobFunction) => void;
  onEdit: (jobFunction: JobFunctionWithJobFunction) => void;
  onOpenEmployees: (jobFunction: JobFunctionWithJobFunction) => void;
  onOpenTimingRule: (jobFunction: JobFunctionWithJobFunction) => void;
  onReactivate: (jobFunction: JobFunctionWithJobFunction) => void;
  onToggleDetails: (jobFunctionId: number) => void;
};

export default function JobFunctionsList({
  expandedJobFunctionIds,
  jobFunctions,
  loading,
  missingPayrollTypeWarning,
  onArchive,
  onCopy,
  onEdit,
  onOpenEmployees,
  onOpenTimingRule,
  onReactivate,
  onToggleDetails,
}: JobFunctionsListProps) {
  return (
    <div className="p-5">
      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
        Brug jobfunktioner til at styre hvilke roller en vagt kræver, hvilke
        medarbejdere der kan ønskes, tildeles eller foreslås til vagten, og
        eventuel eksportkode og adgang for medarbejdere.
      </div>

      <JobFunctionMissingPayrollWarning
        count={missingPayrollTypeWarning.count}
        names={missingPayrollTypeWarning.names}
        remainingCount={missingPayrollTypeWarning.remainingCount}
        visible={missingPayrollTypeWarning.visible}
      />

      {loading && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Indlæser jobfunktioner...
        </div>
      )}

      {!loading && jobFunctions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ingen jobfunktioner fundet.
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Opret den første jobfunktion, fx A Vagt, B Vagt eller Personalemøde.
          </p>
        </div>
      )}

      {!loading && jobFunctions.length > 0 && (
        <div className="space-y-3">
          {jobFunctions.map((jobFunction) => (
            <JobFunctionCard
              key={jobFunction.id}
              jobFunction={jobFunction}
              isExpanded={expandedJobFunctionIds.has(jobFunction.id)}
              onArchive={onArchive}
              onCopy={onCopy}
              onEdit={onEdit}
              onOpenEmployees={onOpenEmployees}
              onOpenTimingRule={onOpenTimingRule}
              onReactivate={onReactivate}
              onToggleDetails={onToggleDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
