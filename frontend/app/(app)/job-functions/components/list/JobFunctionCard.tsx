import JobFunctionCardActions from "./JobFunctionCardActions";
import JobFunctionCardDetails from "./JobFunctionCardDetails";
import JobFunctionCardHeader from "./JobFunctionCardHeader";
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
  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <JobFunctionCardHeader jobFunction={jobFunction} />
          <JobFunctionCardActions
            jobFunction={jobFunction}
            isExpanded={isExpanded}
            onArchive={onArchive}
            onEdit={onEdit}
            onOpenEmployees={onOpenEmployees}
            onOpenTimingRule={onOpenTimingRule}
            onReactivate={onReactivate}
            onToggleDetails={onToggleDetails}
          />
        </div>

        {isExpanded && <JobFunctionCardDetails jobFunction={jobFunction} />}
      </div>
    </li>
  );
}
