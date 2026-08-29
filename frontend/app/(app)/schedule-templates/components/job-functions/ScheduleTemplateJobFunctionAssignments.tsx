import {
  formatUserName,
  getAssignedUserIdSet,
  getAssignmentUserId,
  getSameDayAssignmentNotices,
  type ScheduleTemplateAssignment,
  type ScheduleTemplateUser,
  type TemplateJobFunction,
} from "../../helpers/job-functions/scheduleTemplateJobFunctionCardHelpers";

type ScheduleTemplateJobFunctionAssignmentsProps = {
  item: TemplateJobFunction;
  employees: ScheduleTemplateUser[];
  assignedCount: number;
  sameDayJobFunctions: TemplateJobFunction[];
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

const selectClass =
  "mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

export default function ScheduleTemplateJobFunctionAssignments({
  item,
  employees,
  assignedCount,
  sameDayJobFunctions,
  savingAssignmentKey,
  onAddAssignment,
  onRemoveAssignment,
}: ScheduleTemplateJobFunctionAssignmentsProps) {
  const assignedUserIds =
    getAssignedUserIdSet(item);
  const availableEmployees =
    employees.filter(
      (employee) =>
        !assignedUserIds.has(
          employee.id,
        ),
    );

  function getEmployeeNotice(
    userId: number,
  ) {
    return getSameDayAssignmentNotices(
      item,
      sameDayJobFunctions,
      userId,
    );
  }

  function formatEmployeeOption(
    employee: ScheduleTemplateUser,
  ) {
    const notices =
      getEmployeeNotice(employee.id);
    if (notices.length === 0) {
      return formatUserName(employee);
    }

    const overlaps = notices.filter(
      (notice) =>
        notice.potentialOverlap,
    );
    const names = (
      overlaps.length > 0
        ? overlaps
        : notices
    )
      .map(
        (notice) =>
          notice.jobFunctionName,
      )
      .join(", ");

    return overlaps.length > 0
      ? `${formatUserName(
          employee,
        )} · ⚠ muligt overlap med ${names}`
      : `${formatUserName(
          employee,
        )} · har også ${names}`;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <p className="font-black text-gray-950 dark:text-white">
        Faste medarbejdere
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {(item.assignments ?? [])
          .length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-300">
            Ingen faste medarbejdere
            valgt.
          </p>
        )}

        {(item.assignments ?? []).map(
          (assignment) => {
            const removeKey =
              `${item.id}:remove:${assignment.id}`;

            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold">
                    {formatUserName(
                      assignment.user,
                    )}
                  </span>

                  {(() => {
                    const userId =
                      getAssignmentUserId(
                        assignment,
                      );
                    const notices =
                      userId === null
                        ? []
                        : getEmployeeNotice(
                            userId,
                          );

                    if (
                      notices.length === 0
                    ) {
                      return null;
                    }

                    const overlaps =
                      notices.filter(
                        (notice) =>
                          notice.potentialOverlap,
                      );
                    const names = (
                      overlaps.length > 0
                        ? overlaps
                        : notices
                    )
                      .map(
                        (notice) =>
                          notice.jobFunctionName,
                      )
                      .join(", ");

                    return (
                      <p
                        className={`mt-1 text-xs font-medium ${
                          overlaps.length >
                          0
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {overlaps.length >
                        0
                          ? `Muligt overlap med ${names} ud fra jobfunktionernes tidsregler.`
                          : `Har også ${names} denne ugedag.`}
                      </p>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onRemoveAssignment(
                      item,
                      assignment,
                    )
                  }
                  className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-red-200 disabled:bg-red-50 disabled:text-red-400 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/40 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:border-red-950 dark:disabled:bg-red-950/20 dark:disabled:text-red-500"
                  disabled={
                    savingAssignmentKey ===
                    removeKey
                  }
                >
                  {savingAssignmentKey ===
                  removeKey
                    ? "Fjerner..."
                    : "Fjern"}
                </button>
              </div>
            );
          },
        )}
      </div>

      <label className="mt-3 block text-sm font-semibold text-gray-800 dark:text-gray-200">
        Tilføj fast medarbejder

        <select
          defaultValue=""
          onChange={(event) => {
            const selectedValue =
              event.target.value;

            event.currentTarget.value =
              "";
            onAddAssignment(
              item,
              selectedValue,
            );
          }}
          className={selectClass}
          disabled={
            savingAssignmentKey ===
              `${item.id}:add` ||
            availableEmployees.length ===
              0 ||
            assignedCount >=
              item.requiredCount
          }
        >
          <option value="">
            {assignedCount >=
            item.requiredCount
              ? "Alle vagter har fast medarbejder"
              : "Vælg medarbejder"}
          </option>

          {availableEmployees.map(
            (employee) => (
              <option
                key={employee.id}
                value={employee.id}
              >
                {formatEmployeeOption(
                  employee,
                )}
              </option>
            ),
          )}
        </select>

        <p className="mt-2 text-xs font-normal text-gray-500 dark:text-gray-400">
          Medarbejdere med en anden vagt samme ugedag kan stadig vælges.
          ⚠ betyder, at jobfunktionernes tidsregler ikke kan udelukke overlap.
          De endelige tider afhænger af filmprogrammet.
        </p>
      </label>
    </div>
  );
}
