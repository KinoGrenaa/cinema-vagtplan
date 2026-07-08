import {
  countAssignedTemplateUsers,
  getJobFunctionStaffingGap,
} from "../helpers/scheduleTemplateStaffingGaps";

type DayPeriod = {
  id: number;
  name: string;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

type JobFunction = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  dayPeriod?: DayPeriod | null;
};

type ScheduleTemplateUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
};

type ScheduleTemplateAssignment = {
  id: number;
  userId?: number | null;
  sortOrder?: number | null;
  user?: ScheduleTemplateUser | null;
};

type TemplateJobFunction = {
  id: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  jobFunction: JobFunction;
  assignments?: ScheduleTemplateAssignment[];
};

type TemplateJobFunctionUpdates = Partial<
  Pick<TemplateJobFunction, "requiredCount" | "sortOrder" | "note">
>;

type ScheduleTemplateJobFunctionCardProps = {
  item: TemplateJobFunction;
  employees: ScheduleTemplateUser[];
  expanded: boolean;
  savingAssignmentKey: string | null;
  onToggleDetails: (id: number) => void;
  onRemoveJobFunction: (item: TemplateJobFunction) => void | Promise<void>;
  onAddAssignment: (
    item: TemplateJobFunction,
    userIdValue: number | string,
  ) => void | Promise<void>;
  onRemoveAssignment: (
    item: TemplateJobFunction,
    assignment: ScheduleTemplateAssignment,
  ) => void | Promise<void>;
  onUpdateJobFunction: (
    item: TemplateJobFunction,
    updates: TemplateJobFunctionUpdates,
  ) => void | Promise<void>;
};

function minuteToTime(value: number) {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(Math.trunc(value), 0), 1439)
    : 0;
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDayPeriod(dayPeriod: DayPeriod | null | undefined) {
  if (!dayPeriod) return "Ingen dagsperiode";

  return `${dayPeriod.name} · kl. ${minuteToTime(dayPeriod.startMinute)}-${minuteToTime(dayPeriod.endMinute)}`;
}

function formatUserName(user: ScheduleTemplateUser | null | undefined) {
  if (!user) return "Ukendt medarbejder";

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

function getAssignmentUserId(assignment: ScheduleTemplateAssignment) {
  const userId = Number(assignment.userId ?? assignment.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

function getAssignedUserIdSet(item: TemplateJobFunction) {
  return new Set(
    (item.assignments ?? [])
      .map(getAssignmentUserId)
      .filter((userId): userId is number => userId !== null),
  );
}

function parseOptionalPositiveInteger(value: string, fallback: number) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return fallback;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function formatOpenShiftText(openShiftCount: number) {
  return openShiftCount === 1
    ? "1 åben vagt"
    : `${openShiftCount} åbne vagter`;
}

export type { TemplateJobFunction, ScheduleTemplateAssignment };

export default function ScheduleTemplateJobFunctionCard({
  item,
  employees,
  expanded,
  savingAssignmentKey,
  onToggleDetails,
  onRemoveJobFunction,
  onAddAssignment,
  onRemoveAssignment,
  onUpdateJobFunction,
}: ScheduleTemplateJobFunctionCardProps) {
  const assignedCount = countAssignedTemplateUsers(item.assignments);
  const missingCount = getJobFunctionStaffingGap(item);
  const assignedUserIds = getAssignedUserIdSet(item);
  const availableEmployees = employees.filter(
    (employee) => !assignedUserIds.has(employee.id),
  );

  return (
    <div
      className={`rounded-3xl border p-4 ${
        missingCount > 0
          ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20"
          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.jobFunction.color }}
            />
            <h4 className="text-lg font-black">{item.jobFunction.name}</h4>
            {missingCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                {formatOpenShiftText(missingCount)}
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 dark:bg-green-950/60 dark:text-green-100">
                Fast bemandet
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {formatDayPeriod(item.jobFunction.dayPeriod)} · {assignedCount}/
            {item.requiredCount} faste medarbejdere
          </p>
          {item.note && (
            <p className="mt-2 rounded-2xl bg-white p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {item.note}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleDetails(item.id)}
            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-white dark:border-gray-700 dark:hover:bg-gray-900"
          >
            {expanded ? "Skjul detaljer" : "Vis detaljer"}
          </button>
          <button
            type="button"
            onClick={() => onRemoveJobFunction(item)}
            className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Fjern
          </button>
        </div>
      </div>

      {missingCount > 0 && (
        <div className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
          <p className="font-black">Åben vagt fra skabelonen</p>
          <p className="mt-1">
            Når skabelonen bruges i vagtplanlægningen, oprettes{" "}
            {formatOpenShiftText(missingCount)} uden fast medarbejder, så
            medarbejderne kan ønske dem.
          </p>
        </div>
      )}

      {expanded && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
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

          <div className="rounded-2xl bg-white p-4 dark:bg-gray-900">
            <p className="font-black">Indstillinger</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Antal vagter
                <input
                  key={`required-${item.id}-${item.requiredCount}`}
                  type="number"
                  min="1"
                  max="50"
                  defaultValue={item.requiredCount}
                  onBlur={(event) => {
                    const value = parseOptionalPositiveInteger(
                      event.currentTarget.value,
                      item.requiredCount,
                    );

                    if (!value || value < 1 || value > 50) {
                      event.currentTarget.value = String(item.requiredCount);
                      return;
                    }

                    if (value !== item.requiredCount) {
                      onUpdateJobFunction(item, { requiredCount: value });
                    }
                  }}
                  className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </label>

              <label className="block text-sm font-semibold">
                Sortering
                <input
                  key={`sort-${item.id}-${item.sortOrder}`}
                  type="number"
                  min="0"
                  defaultValue={item.sortOrder}
                  onBlur={(event) => {
                    const value = parseOptionalPositiveInteger(
                      event.currentTarget.value,
                      item.sortOrder,
                    );

                    if (value === null) {
                      event.currentTarget.value = String(item.sortOrder);
                      return;
                    }

                    if (value !== item.sortOrder) {
                      onUpdateJobFunction(item, { sortOrder: value });
                    }
                  }}
                  className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </label>

              <label className="block text-sm font-semibold sm:col-span-2">
                Note
                <textarea
                  key={`note-${item.id}-${item.note ?? ""}`}
                  defaultValue={item.note ?? ""}
                  onBlur={(event) => {
                    const value = event.currentTarget.value.trim() || null;

                    if (value !== item.note) {
                      onUpdateJobFunction(item, { note: value });
                    }
                  }}
                  className="mt-1 min-h-20 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
