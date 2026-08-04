import JobFunctionEmployeeAssignmentControls from "./JobFunctionEmployeeAssignmentControls";
import JobFunctionEmployeeAssignmentsList from "./JobFunctionEmployeeAssignmentsList";
import JobFunctionEmployeeModalHeader from "./JobFunctionEmployeeModalHeader";
import type { JobFunctionWithJobFunction } from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type { User, UserJobFunction } from "../../helpers/types/jobFunctionTypes";

type JobFunctionEmployeeModalProps = {
  jobFunction: JobFunctionWithJobFunction;
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
        <JobFunctionEmployeeModalHeader
          assignmentSaving={assignmentSaving}
          jobFunction={jobFunction}
          onClose={onClose}
        />

        <JobFunctionEmployeeAssignmentControls
          assignmentSaving={assignmentSaving}
          availableUsers={availableUsers}
          isActive={jobFunction.isActive}
          selectedUserId={selectedUserId}
          onAssignSelectedUser={onAssignSelectedUser}
          onSelectedUserIdChange={onSelectedUserIdChange}
        />

        <JobFunctionEmployeeAssignmentsList
          assignments={assignments}
          assignmentLoading={assignmentLoading}
          assignmentSaving={assignmentSaving}
          onRemoveAssignedUser={onRemoveAssignedUser}
        />
      </div>
    </div>
  );
}
