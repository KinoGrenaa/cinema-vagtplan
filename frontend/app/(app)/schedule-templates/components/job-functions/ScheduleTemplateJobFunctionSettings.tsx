import {
  parseOptionalPositiveInteger,
  type TemplateJobFunction,
  type TemplateJobFunctionUpdates,
} from "../../helpers/job-functions/scheduleTemplateJobFunctionCardHelpers";

type ScheduleTemplateJobFunctionSettingsProps = {
  item: TemplateJobFunction;
  onUpdateJobFunction: (
    item: TemplateJobFunction,
    updates: TemplateJobFunctionUpdates,
  ) => void | Promise<void>;
};

const fieldClass =
  "mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25";

export default function ScheduleTemplateJobFunctionSettings({
  item,
  onUpdateJobFunction,
}: ScheduleTemplateJobFunctionSettingsProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <p className="font-black text-gray-950 dark:text-white">
        Indstillinger
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Antal vagter

          <input
            key={`required-${item.id}-${item.requiredCount}`}
            type="number"
            min="1"
            max="50"
            defaultValue={
              item.requiredCount
            }
            onBlur={(event) => {
              const value =
                parseOptionalPositiveInteger(
                  event.currentTarget
                    .value,
                  item.requiredCount,
                );

              if (
                !value ||
                value < 1 ||
                value > 50
              ) {
                event.currentTarget.value =
                  String(
                    item.requiredCount,
                  );
                return;
              }

              if (
                value !==
                item.requiredCount
              ) {
                onUpdateJobFunction(
                  item,
                  {
                    requiredCount:
                      value,
                  },
                );
              }
            }}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Sortering

          <input
            key={`sort-${item.id}-${item.sortOrder}`}
            type="number"
            min="0"
            defaultValue={
              item.sortOrder
            }
            onBlur={(event) => {
              const value =
                parseOptionalPositiveInteger(
                  event.currentTarget
                    .value,
                  item.sortOrder,
                );

              if (value === null) {
                event.currentTarget.value =
                  String(
                    item.sortOrder,
                  );
                return;
              }

              if (
                value !==
                item.sortOrder
              ) {
                onUpdateJobFunction(
                  item,
                  {
                    sortOrder: value,
                  },
                );
              }
            }}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 sm:col-span-2">
          Note

          <textarea
            key={`note-${item.id}-${item.note ?? ""}`}
            defaultValue={
              item.note ?? ""
            }
            onBlur={(event) => {
              const value =
                event.currentTarget.value.trim() ||
                null;

              if (
                value !== item.note
              ) {
                onUpdateJobFunction(
                  item,
                  { note: value },
                );
              }
            }}
            className={`${fieldClass} min-h-20`}
          />
        </label>
      </div>
    </div>
  );
}
