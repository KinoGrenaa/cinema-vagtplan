import ScheduleTemplateJobFunctionAssignments from "./ScheduleTemplateJobFunctionAssignments";
import ScheduleTemplateJobFunctionSettings from "./ScheduleTemplateJobFunctionSettings";
import {
  formatDayPeriod,
  formatOpenShiftText,
  type ScheduleTemplateAssignment,
  type ScheduleTemplateUser,
  type TemplateJobFunction,
  type TemplateJobFunctionUpdates,
} from "../../helpers/job-functions/scheduleTemplateJobFunctionCardHelpers";
import {
  countAssignedTemplateUsers,
  getJobFunctionStaffingGap,
} from "../../helpers/page/scheduleTemplateStaffingGaps";

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
          <ScheduleTemplateJobFunctionAssignments
            item={item}
            employees={employees}
            assignedCount={assignedCount}
            savingAssignmentKey={savingAssignmentKey}
            onAddAssignment={onAddAssignment}
            onRemoveAssignment={onRemoveAssignment}
          />
          <ScheduleTemplateJobFunctionSettings
            item={item}
            onUpdateJobFunction={onUpdateJobFunction}
          />
        </div>
      )}
    </div>
  );
}
