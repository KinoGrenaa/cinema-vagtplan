type JobFunctionEmployeeAssignmentsListHeaderProps = {
  count: number;
};

export default function JobFunctionEmployeeAssignmentsListHeader({
  count,
}: JobFunctionEmployeeAssignmentsListHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Tildelte medarbejdere
      </h3>
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        {count}
      </span>
    </div>
  );
}
