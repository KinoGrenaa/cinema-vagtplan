import {
  formatTemplateLabel,
  getTemplateDayAssignedCount,
  getTemplateDayForDate,
  getTemplateDayRequiredCount,
  getTemplateWeekParityWarning,
  getWeekdayName,
} from "../../helpers/shiftPlanningHelpers";
import type { ScheduleTemplateSummary } from "../../helpers/shiftPlanningTypes";
import { ShiftPlanningTemplatePreviewJobFunctionCard } from "./ShiftPlanningTemplatePreviewJobFunctionCard";
import { ShiftPlanningTemplatePreviewMetricCard } from "./ShiftPlanningTemplatePreviewMetricCard";
import { ShiftPlanningTemplatePreviewStateMessage } from "./ShiftPlanningTemplatePreviewStateMessage";

type ShiftPlanningTemplatePreviewProps = {
  dateKey: string;
  isActive: boolean;
  template: ScheduleTemplateSummary | null;
};

export default function ShiftPlanningTemplatePreview({
  dateKey,
  isActive,
  template,
}: ShiftPlanningTemplatePreviewProps) {
  if (!isActive) {
    return (
      <ShiftPlanningTemplatePreviewStateMessage tone="inactive">
        Dagen er markeret som inaktiv i månedsplanen. Der bruges derfor ingen vagtsskabelon på
        denne dato.
      </ShiftPlanningTemplatePreviewStateMessage>
    );
  }

  if (!template) {
    return (
      <ShiftPlanningTemplatePreviewStateMessage tone="missing">
        Vælg en vagtsskabelon for at se, hvilke jobfunktioner og
        standardmedarbejdere der ligger på denne ugedag.
      </ShiftPlanningTemplatePreviewStateMessage>
    );
  }

  const templateDay = getTemplateDayForDate(template, dateKey);
  const templateJobFunctions = templateDay?.jobFunctions ?? [];
  const requiredCount = getTemplateDayRequiredCount(templateDay);
  const assignedCount = getTemplateDayAssignedCount(templateDay);
  const weekdayName = getWeekdayName(dateKey, "long");
  const weekParityWarning = getTemplateWeekParityWarning(template, dateKey);

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Skabelonpreview for valgt dato
          </p>
          <h3 className="mt-1 text-base font-bold text-gray-950 dark:text-white">
            {formatTemplateLabel(template)}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Viser den aktive opsætning for {weekdayName}, før der forberedes en kladde.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">
          <ShiftPlanningTemplatePreviewMetricCard
            label="funktioner"
            value={templateJobFunctions.length}
          />
          <ShiftPlanningTemplatePreviewMetricCard
            label="vagter"
            value={requiredCount}
          />
          <ShiftPlanningTemplatePreviewMetricCard
            label="standard"
            value={assignedCount}
          />
        </div>
      </div>

      {weekParityWarning && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Tjek ugeopsætning: {weekParityWarning}
        </p>
      )}

      {!templateDay && (
        <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Skabelonen har ingen aktiv opsætning for {weekdayName}. Denne dato får
          derfor ingen planlagte jobfunktioner fra skabelonen endnu.
        </p>
      )}

      {templateDay && templateJobFunctions.length === 0 && (
        <ShiftPlanningTemplatePreviewStateMessage tone="empty">
          Ugedagen er aktiv i skabelonen, men der er ikke lagt jobfunktioner på
          den endnu.
        </ShiftPlanningTemplatePreviewStateMessage>
      )}

      {templateJobFunctions.length > 0 && (
        <div className="mt-4 space-y-2">
          {templateJobFunctions.map((templateJobFunction) => (
            <ShiftPlanningTemplatePreviewJobFunctionCard
              key={templateJobFunction.id}
              templateJobFunction={templateJobFunction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
