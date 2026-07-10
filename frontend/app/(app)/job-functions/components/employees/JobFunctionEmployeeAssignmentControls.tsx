import { formatUserName } from "../../helpers/page/jobFunctionHelpers";
import type { User } from "../../helpers/types/jobFunctionTypes";

type JobFunctionEmployeeAssignmentControlsProps = {
  assignmentSaving: boolean;
  availableUsers: User[];
  isActive: boolean;
  selectedUserId: string;
  onAssignSelectedUser: () => void;
  onSelectedUserIdChange: (userId: string) => void;
};

export default function JobFunctionEmployeeAssignmentControls({
  assignmentSaving,
  availableUsers,
  isActive,
  selectedUserId,
  onAssignSelectedUser,
  onSelectedUserIdChange,
}: JobFunctionEmployeeAssignmentControlsProps) {
  if (!isActive) {
    return (
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Jobfunktionen er arkiveret. Du kan se og fjerne medarbejdere, men nye
        medarbejdere kan først tilføjes efter genaktivering.
      </div>
    );
  }

  return (
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
  );
}
