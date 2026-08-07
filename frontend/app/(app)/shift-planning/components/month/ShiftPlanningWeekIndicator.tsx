import { useState } from "react";

import type { ScheduleTemplateSummary } from "../../helpers/shiftPlanningTypes";

type ShiftPlanningWeekIndicatorProps = {
  weekNumber: number | null;
  activeDays: number;
  daysWithTemplate: number;
  missingTemplateDays: number;
  templates: ScheduleTemplateSummary[];
  saving: boolean;
  editable: boolean;
  showPlanningLayer: boolean;
  canReset: boolean;
  scheduledShiftCount: number;
  canReplacePlannedShifts: boolean;
  onApplyTemplate: (scheduleTemplateId: string) => void | Promise<void>;
  onResetWeek: () => void | Promise<void>;
  onReplacePlannedShifts: () => void | Promise<void>;
  onRemovePlannedShifts: () => void | Promise<void>;
};

export default function ShiftPlanningWeekIndicator({
  weekNumber,
  activeDays,
  daysWithTemplate,
  missingTemplateDays,
  templates,
  saving,
  editable,
  showPlanningLayer,
  canReset,
  scheduledShiftCount,
  canReplacePlannedShifts,
  onApplyTemplate,
  onResetWeek,
  onReplacePlannedShifts,
  onRemovePlannedShifts,
}: ShiftPlanningWeekIndicatorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const canApply =
    editable && Boolean(selectedTemplateId) && activeDays > 0 && !saving;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 text-left text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <p className="text-lg font-bold text-gray-950 dark:text-white">
        Uge {weekNumber ?? "?"}
      </p>
      <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
        <p>{activeDays} aktive dage</p>
        {showPlanningLayer ? (
          <>
            <p>{daysWithTemplate} med skabelon</p>
            <p>{missingTemplateDays} mangler planlægning</p>
          </>
        ) : (
          <p>
            {scheduledShiftCount} {scheduledShiftCount === 1 ? "vagt" : "vagter"} i vagtplanen
          </p>
        )}
      </div>
      {showPlanningLayer && (
        <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
          htmlFor={`week-template-${weekNumber ?? "unknown"}`}
        >
          Skabelon
        </label>
        <select
          id={`week-template-${weekNumber ?? "unknown"}`}
          value={selectedTemplateId}
          onChange={(event) => setSelectedTemplateId(event.target.value)}
          title={editable ? undefined : "Vælg eller opret en åben kladde først."}
          className="block w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          disabled={
            !editable || saving || activeDays === 0 || templates.length === 0
          }
        >
          <option value="">Vælg</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => void onApplyTemplate(selectedTemplateId)}
            title={editable ? undefined : "Vælg eller opret en åben kladde først."}
            className="w-full rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
            disabled={!canApply}
          >
            {saving ? "Gemmer..." : "Anvend"}
          </button>
          <button
            type="button"
            onClick={() => void onResetWeek()}
            title={
              editable
                ? "Fjerner skabelonen og de beregnede forslag fra ugens fremtidige dage. Eksisterende vagter påvirkes ikke."
                : "Vælg eller opret en åben kladde først."
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-950 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-amber-600 dark:hover:bg-amber-950/50 dark:hover:text-amber-100 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-gray-900"
            disabled={!editable || !canReset || saving}
          >
            Nulstil uge
          </button>
        </div>
        </div>
      )}
      {scheduledShiftCount > 0 && (
        <div
          className={`mt-2 grid gap-1.5 ${
            canReplacePlannedShifts ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {canReplacePlannedShifts && (
            <button
              type="button"
              onClick={() => void onReplacePlannedShifts()}
              title="Viser præcis hvilke eksisterende planlægningsvagter der fjernes, og hvilke vagter fra kladden der oprettes."
              className="whitespace-nowrap rounded-lg border border-violet-300 bg-violet-50 px-2 py-1.5 text-xs font-semibold leading-tight text-violet-800 transition hover:border-violet-500 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:border-violet-600 dark:hover:bg-violet-950/70 dark:focus-visible:ring-violet-400 dark:focus-visible:ring-offset-gray-900"
              disabled={saving}
            >
              Erstat
            </button>
          )}
          <button
            type="button"
            onClick={() => void onRemovePlannedShifts()}
            title="Forhåndsviser fjernelse af faktiske vagter, som er oprettet fra vagtplanlægningen. Manuelle vagter røres ikke."
            className="whitespace-nowrap rounded-lg border border-red-300 bg-white px-2 py-1.5 text-xs font-semibold leading-tight text-red-700 transition hover:border-red-500 hover:bg-red-50 hover:text-red-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-100 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900"
            disabled={saving}
          >
            Fjern
          </button>
        </div>
      )}
    </div>
  );
}
