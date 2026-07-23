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
  onRemoveJobFunction: (
    item: TemplateJobFunction,
  ) => void | Promise<void>;
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

export type {
  TemplateJobFunction,
  ScheduleTemplateAssignment,
};

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
  const assignedCount =
    countAssignedTemplateUsers(
      item.assignments,
    );
  const missingCount =
    getJobFunctionStaffingGap(item);

  return (
    <div
      className={`rounded-3xl border p-4 text-gray-900 shadow-sm transition-colors dark:text-gray-100 ${
        missingCount > 0
          ? "border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/25"
          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-3 w-3 rounded-full ring-1 ring-black/10 dark:ring-white/20"
              style={{
                backgroundColor:
                  item.jobFunction.color,
              }}
            />

            <h4 className="text-lg font-black text-gray-950 dark:text-white">
              {item.jobFunction.name}
            </h4>

            {missingCount > 0 ? (
              <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
                {formatOpenShiftText(
                  missingCount,
                )}
              </span>
            ) : (
              <span className="rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-black text-green-900 dark:border-green-800 dark:bg-green-950/60 dark:text-green-100">
                Fast bemandet
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {formatDayPeriod(
              item.jobFunction
                .dayPeriod,
            )}{" "}
            · {assignedCount}/
            {item.requiredCount} faste
            medarbejdere
          </p>

          {item.note && (
            <p className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              {item.note}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              onToggleDetails(item.id)
            }
            aria-expanded={expanded}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:active:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-950"
          >
            {expanded
              ? "Skjul detaljer"
              : "Vis detaljer"}
          </button>

          <button
            type="button"
            onClick={() =>
              onRemoveJobFunction(item)
            }
            className="rounded-2xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950"
          >
            Fjern
          </button>
        </div>
      </div>

      {missingCount > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-100 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
          <p className="font-black">
            Åben vagt fra skabelonen
          </p>

          <p className="mt-1">
            Når skabelonen bruges i
            vagtplanlægningen, oprettes{" "}
            {formatOpenShiftText(
              missingCount,
            )}{" "}
            uden fast medarbejder, så
            medarbejderne kan ønske dem.
          </p>
        </div>
      )}

      {expanded && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <ScheduleTemplateJobFunctionAssignments
            item={item}
            employees={employees}
            assignedCount={
              assignedCount
            }
            savingAssignmentKey={
              savingAssignmentKey
            }
            onAddAssignment={
              onAddAssignment
            }
            onRemoveAssignment={
              onRemoveAssignment
            }
          />

          <ScheduleTemplateJobFunctionSettings
            item={item}
            onUpdateJobFunction={
              onUpdateJobFunction
            }
          />
        </div>
      )}
    </div>
  );
}
