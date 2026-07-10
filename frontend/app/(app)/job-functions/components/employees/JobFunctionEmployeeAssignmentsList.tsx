import type { UserJobFunction } from "../../helpers/types/jobFunctionTypes";

import JobFunctionEmployeeAssignmentRow from "./JobFunctionEmployeeAssignmentRow";
import JobFunctionEmployeeAssignmentsListHeader from "./JobFunctionEmployeeAssignmentsListHeader";
import JobFunctionEmployeeAssignmentsListState from "./JobFunctionEmployeeAssignmentsListState";

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
  if (assignmentLoading) {
    return (
      <div className="space-y-3">
        <JobFunctionEmployeeAssignmentsListHeader count={assignments.length} />
        <JobFunctionEmployeeAssignmentsListState>
          Henter medarbejdere...
        </JobFunctionEmployeeAssignmentsListState>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-3">
        <JobFunctionEmployeeAssignmentsListHeader count={assignments.length} />
        <JobFunctionEmployeeAssignmentsListState>
          Ingen medarbejdere har denne jobfunktion endnu.
        </JobFunctionEmployeeAssignmentsListState>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <JobFunctionEmployeeAssignmentsListHeader count={assignments.length} />
      <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        {assignments.map((assignment) => (
          <JobFunctionEmployeeAssignmentRow
            key={assignment.id}
            assignment={assignment}
            assignmentSaving={assignmentSaving}
            onRemoveAssignedUser={onRemoveAssignedUser}
          />
        ))}
      </div>
    </div>
  );
}
