import { useState } from "react";

import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import EmployeePickerModal from "@/app/components/employees/EmployeePickerModal";
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
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const selectedUser =
    availableUsers.find((user) => String(user.id) === selectedUserId) ?? null;

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
        <div className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
          {selectedUser ? (
            <div className="flex min-w-0 items-center gap-3">
              <EmployeeAvatar
                name={formatUserName(selectedUser)}
                profileImage={selectedUser.profileImage}
                className="!h-8 !w-8 !text-xs"
              />
              <span className="min-w-0 truncate font-semibold">
                {formatUserName(selectedUser)} · {selectedUser.email}
              </span>
            </div>
          ) : (
            <span className="block truncate font-semibold">
              {availableUsers.length === 0
                ? "Alle aktive medarbejdere er tilføjet"
                : "Ingen medarbejder valgt"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEmployeePickerOpen(true)}
          className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950"
          disabled={assignmentSaving || availableUsers.length === 0}
        >
          {selectedUser ? "Skift" : "Vælg medarbejder"}
        </button>
        <button
          type="button"
          onClick={onAssignSelectedUser}
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          disabled={
            assignmentSaving || !selectedUserId || availableUsers.length === 0
          }
        >
          {assignmentSaving ? "Tilføjer..." : "Tilføj"}
        </button>
      </div>
      <EmployeePickerModal
        open={employeePickerOpen}
        title="Vælg medarbejder"
        description="Vælg den medarbejder, der skal have jobfunktionen."
        options={availableUsers.map((user) => ({
          id: user.id,
          name: formatUserName(user),
          profileImage: user.profileImage ?? null,
          detail: user.email,
        }))}
        selectedEmployeeId={selectedUser?.id ?? null}
        confirmLabel="Vælg medarbejder"
        emptyText="Ingen medarbejdere kan tilføjes."
        onClose={() => setEmployeePickerOpen(false)}
        onConfirm={(employeeId) => {
          onSelectedUserIdChange(String(employeeId));
        }}
      />
    </div>
  );
}
