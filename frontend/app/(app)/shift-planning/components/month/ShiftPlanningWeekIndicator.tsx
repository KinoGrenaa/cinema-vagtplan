import { useState } from "react";

import type { ScheduleTemplateSummary } from "../../helpers/shiftPlanningTypes";

type ShiftPlanningWeekIndicatorProps = {
  weekNumber: number | null;
  activeDays: number;
  daysWithTemplate: number;
  missingTemplateDays: number;
  templates: ScheduleTemplateSummary[];
  saving: boolean;
  onApplyTemplate: (scheduleTemplateId: string) => void | Promise<void>;
};

export default function ShiftPlanningWeekIndicator({
  weekNumber,
  activeDays,
  daysWithTemplate,
  missingTemplateDays,
  templates,
  saving,
  onApplyTemplate,
}: ShiftPlanningWeekIndicatorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const canApply = Boolean(selectedTemplateId) && activeDays > 0 && !saving;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Uge
          </p>
          <p className="text-2xl font-bold text-gray-950 dark:text-white">
            {weekNumber ?? "?"}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
        <p>{activeDays} aktive dage</p>
        <p>{daysWithTemplate} med vagtsskabelon</p>
        <p>{missingTemplateDays} mangler planlægning</p>
      </div>

      <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Vagtsskabelon for uge
        </label>
        <select
          value={selectedTemplateId}
          onChange={(event) => setSelectedTemplateId(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={saving || activeDays === 0 || templates.length === 0}
        >
          <option value="">Vælg skabelon</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            void onApplyTemplate(selectedTemplateId);
          }}
          className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canApply}
        >
          {saving ? "Anvender..." : "Anvend på uge"}
        </button>
      </div>
    </div>
  );
}
