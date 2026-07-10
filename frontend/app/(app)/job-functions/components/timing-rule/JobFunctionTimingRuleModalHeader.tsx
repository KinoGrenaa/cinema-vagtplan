import type { JobFunctionWithWorkType } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type JobFunctionTimingRuleModalHeaderProps = {
  jobFunction: JobFunctionWithWorkType;
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
        Reglen bruges til at beregne mødetid og fyraften ud fra dagsperiode,
        filmprogram og tider uden filmprogram, når vagtplanlægning opretter
        vagter fra en forhåndsvisning.
      </p>
    </div>
  );
}
