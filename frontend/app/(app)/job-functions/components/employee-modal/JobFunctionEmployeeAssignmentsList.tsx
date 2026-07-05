import { formatUserName } from "../../helpers/page/jobFunctionHelpers";
import type { UserJobFunction } from "../../helpers/types/jobFunctionTypes";

type JobFunctionEmployeeAssignmentsListProps = {
  assignments: UserJobFunction[];
  assignmentLoading: boolean;
  assignmentSaving: boolean;
  onRemoveAssignedUser: (assignment: UserJobFunction) => void;
};

export default function JobFunctionEmployeeAssignmentsList({
  assignments,
  assignmentLoading,
  assignmentSaving,
  onRemoveAssignedUser,
}: JobFunctionEmployeeAssignmentsListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Tildelte medarbejdere
        </h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {assignments.length}
        </span>
      </div>

      {assignmentLoading && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Henter medarbejdere...
        </div>
      )}

      {!assignmentLoading && assignments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Ingen medarbejdere har denne jobfunktion endnu.
        </div>
      )}

      {!assignmentLoading && assignments.length > 0 && (
        <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex flex-col gap-3 bg-white p-4 dark:bg-gray-950/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-gray-950 dark:text-white">
                  {formatUserName(assignment.user)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {assignment.user.email}
                </p>
                {assignment.assignedByUser && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Tildelt af {formatUserName(assignment.assignedByUser)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemoveAssignedUser(assignment)}
                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950"
                disabled={assignmentSaving}
              >
                Fjern
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
