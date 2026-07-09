import {
  parseOptionalPositiveInteger,
  type TemplateJobFunction,
  type TemplateJobFunctionUpdates,
} from "../helpers/scheduleTemplateJobFunctionCardHelpers";

type ScheduleTemplateJobFunctionSettingsProps = {
  item: TemplateJobFunction;
  onUpdateJobFunction: (
    item: TemplateJobFunction,
    updates: TemplateJobFunctionUpdates,
  ) => void | Promise<void>;
};

export default function ScheduleTemplateJobFunctionSettings({
  item,
  onUpdateJobFunction,
}: ScheduleTemplateJobFunctionSettingsProps) {
  return (
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
  );
}
