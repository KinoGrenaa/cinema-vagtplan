import type { ReactNode } from "react";

type JobFunctionEmployeeAssignmentsListStateProps = {
  children: ReactNode;
};

export default function JobFunctionEmployeeAssignmentsListState({
  children,
}: JobFunctionEmployeeAssignmentsListStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {children}
    </div>
  );
}
