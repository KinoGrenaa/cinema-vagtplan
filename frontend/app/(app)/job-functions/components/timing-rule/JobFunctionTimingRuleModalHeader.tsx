import type { JobFunctionWithJobFunction } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionTimingRuleModalHeaderProps = {
  jobFunction: JobFunctionWithJobFunction;
};

export default function JobFunctionTimingRuleModalHeader({
  jobFunction,
}: JobFunctionTimingRuleModalHeaderProps) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
        Møde- og fyraftensregel
      </p>
      <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
        {jobFunction.name}
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Reglen bruger de valgte filmvisninger, filmprogrammet og fallbacktiderne
        til at beregne mødetid og fyraften.
      </p>
    </div>
  );
}
