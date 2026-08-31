import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import { formatUserName } from "../../helpers/page/jobFunctionHelpers";
import type { UserJobFunction } from "../../helpers/types/jobFunctionTypes";

type JobFunctionEmployeeAssignmentRowProps = {
  assignment: UserJobFunction;
  assignmentSaving: boolean;
  onRemoveAssignedUser: (assignment: UserJobFunction) => void;
};

export default function JobFunctionEmployeeAssignmentRow({
  assignment,
  assignmentSaving,
  onRemoveAssignedUser,
}: JobFunctionEmployeeAssignmentRowProps) {
  return (
    <div className="flex flex-col gap-3 bg-white p-4 dark:bg-gray-950/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <EmployeeAvatar
          name={formatUserName(assignment.user)}
          profileImage={assignment.user.profileImage}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-950 dark:text-white">
            {formatUserName(assignment.user)}
          </p>
          <p className="truncate text-sm text-gray-600 dark:text-gray-300">
            {assignment.user.email}
          </p>
          {assignment.assignedByUser && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tildelt af {formatUserName(assignment.assignedByUser)}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemoveAssignedUser(assignment)}
        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-gray-950 dark:text-red-200 dark:hover:bg-red-950 dark:active:bg-red-950/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950"
        disabled={assignmentSaving}
      >
        Fjern
      </button>
    </div>
  );
}
