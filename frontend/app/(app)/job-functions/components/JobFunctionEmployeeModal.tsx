import { formatUserName } from "../helpers/jobFunctionHelpers";
import type { JobFunctionWithWorkType } from "../helpers/jobFunctionPayrollHelpers";
import type { User, UserJobFunction } from "../helpers/jobFunctionTypes";

type JobFunctionEmployeeModalProps = {
  jobFunction: JobFunctionWithWorkType;
  assignments: UserJobFunction[];
  assignmentLoading: boolean;
  assignmentSaving: boolean;
  availableUsers: User[];
  selectedUserId: string;
  onSelectedUserIdChange: (userId: string) => void;
  onAssignSelectedUser: () => void;
  onRemoveAssignedUser: (assignment: UserJobFunction) => void;
  onClose: () => void;
};

export default function JobFunctionEmployeeModal({
  jobFunction,
  assignments,
  assignmentLoading,
  assignmentSaving,
  availableUsers,
  selectedUserId,
  onSelectedUserIdChange,
  onAssignSelectedUser,
  onRemoveAssignedUser,
  onClose,
}: JobFunctionEmployeeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
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

        {jobFunction.isActive && (
          <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Tilføj medarbejder
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedUserId}
                onChange={(event) => onSelectedUserIdChange(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={assignmentSaving || availableUsers.length === 0}
              >
                <option value="">
                  {availableUsers.length === 0
                    ? "Alle aktive medarbejdere er tilføjet"
                    : "Vælg medarbejder"}
                </option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {formatUserName(user)} · {user.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAssignSelectedUser}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  assignmentSaving || !selectedUserId || availableUsers.length === 0
                }
              >
                {assignmentSaving ? "Tilføjer..." : "Tilføj"}
              </button>
            </div>
          </div>
        )}

        {!jobFunction.isActive && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Jobfunktionen er arkiveret. Du kan se og fjerne medarbejdere, men
            nye medarbejdere kan først tilføjes efter genaktivering.
          </div>
        )}

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
      </div>
    </div>
  );
}
