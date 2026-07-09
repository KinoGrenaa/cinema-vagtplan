import {
  formatUserName,
  getAssignedUserIdSet,
  type ScheduleTemplateAssignment,
  type ScheduleTemplateUser,
  type TemplateJobFunction,
} from "../helpers/scheduleTemplateJobFunctionCardHelpers";

type ScheduleTemplateJobFunctionAssignmentsProps = {
  item: TemplateJobFunction;
  employees: ScheduleTemplateUser[];
  assignedCount: number;
  savingAssignmentKey: string | null;
  onAddAssignment: (
    item: TemplateJobFunction,
    userIdValue: number | string,
  ) => void | Promise<void>;
  onRemoveAssignment: (
    item: TemplateJobFunction,
    assignment: ScheduleTemplateAssignment,
  ) => void | Promise<void>;
};

export default function ScheduleTemplateJobFunctionAssignments({
  item,
  employees,
  assignedCount,
  savingAssignmentKey,
  onAddAssignment,
  onRemoveAssignment,
}: ScheduleTemplateJobFunctionAssignmentsProps) {
  const assignedUserIds = getAssignedUserIdSet(item);
  const availableEmployees = employees.filter(
    (employee) => !assignedUserIds.has(employee.id),
  );

  return (
    <div className="rounded-2xl bg-white p-4 dark:bg-gray-900">
      <p className="font-black">Faste medarbejdere</p>
      <div className="mt-3 flex flex-col gap-2">
        {(item.assignments ?? []).length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ingen faste medarbejdere valgt.
          </p>
        )}

        {(item.assignments ?? []).map((assignment) => {
          const removeKey = `${item.id}:remove:${assignment.id}`;

          return (
            <div
              key={assignment.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-800"
            >
              <span className="text-sm font-semibold">
                {formatUserName(assignment.user)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAssignment(item, assignment)}
                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                disabled={savingAssignmentKey === removeKey}
              >
                {savingAssignmentKey === removeKey ? "Fjerner..." : "Fjern"}
              </button>
            </div>
          );
        })}
      </div>

      <label className="mt-3 block text-sm font-semibold">
        Tilføj fast medarbejder
        <select
          defaultValue=""
          onChange={(event) => {
            const selectedValue = event.target.value;
            event.currentTarget.value = "";
            onAddAssignment(item, selectedValue);
          }}
          className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={
            savingAssignmentKey === `${item.id}:add` ||
            availableEmployees.length === 0 ||
            assignedCount >= item.requiredCount
          }
        >
          <option value="">
            {assignedCount >= item.requiredCount
              ? "Alle vagter har fast medarbejder"
              : "Vælg medarbejder"}
          </option>
          {availableEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {formatUserName(employee)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
