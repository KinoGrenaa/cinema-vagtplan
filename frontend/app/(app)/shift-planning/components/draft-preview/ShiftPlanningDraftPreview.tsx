import { useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { ShiftPlanningDraftPreviewMetricsPanel } from "./ShiftPlanningDraftPreviewMetricsPanel";
import { ShiftPlanningDraftPreviewRowCard } from "./ShiftPlanningDraftPreviewRowCard";
import { ShiftPlanningDraftPreviewStatusPanel } from "./ShiftPlanningDraftPreviewStatusPanel";
import {
  getHiddenDraftPreviewAttentionCount,
  getPrioritizedDraftPreviewRows,
} from "../../helpers/shiftPlanningDraftPreviewPriority";
import {
  appendCinemaId,
  getMonthName,
  getMonthPlanDayDateKey,
  getTemplateDayAssignedCount,
  getTemplateDayForDate,
  getTemplateDayRequiredCount,
  getTemplateWeekParityWarning,
  readErrorMessage,
} from "../../helpers/shiftPlanningHelpers";
import type {
  MonthPlanDay,
  ScheduleTemplateSummary,
} from "../../helpers/shiftPlanningTypes";

type ShiftPlanningDraftPreviewProps = {
  activeCinemaId: number | null;
  days: MonthPlanDay[];
  loading: boolean;
  month: number;
  templatesById: Map<number | string, ScheduleTemplateSummary>;
  year: number;
  onOpenDay: (day: MonthPlanDay) => void;
  onDraftPrepared?: (draft: PreparedDraftSummary) => void;
};

export type DraftPreviewRow = {
  day: MonthPlanDay;
  dateKey: string;
  template: ScheduleTemplateSummary | null;
  requiredCount: number;
  assignedCount: number;
  emptyCount: number;
  jobFunctionCount: number;
  warning: string | null;
  hasTemplateDay: boolean;
};

export type PreparedDraftSummary = {
  id: number | string;
  itemCount?: number | null;
  unassignedItemCount?: number | null;
  warningItemCount?: number | null;
  status?: string | null;
  createdAt?: string | null;
};

const MAX_VISIBLE_DAYS = 6;

function getPreviewRows(
  days: MonthPlanDay[],
  templatesById: Map<number | string, ScheduleTemplateSummary>,
): DraftPreviewRow[] {
  return days.map((day) => {
    const dateKey = getMonthPlanDayDateKey(day);
    const template = day.scheduleTemplateId
      ? templatesById.get(day.scheduleTemplateId) ?? day.scheduleTemplate ?? null
      : null;
    const templateDay = getTemplateDayForDate(template, dateKey);
    const requiredCount = getTemplateDayRequiredCount(templateDay);
    const assignedCount = getTemplateDayAssignedCount(templateDay);

    return {
      day,
      dateKey,
      template,
      requiredCount,
      assignedCount,
      emptyCount: Math.max(0, requiredCount - assignedCount),
      jobFunctionCount: templateDay?.jobFunctions?.length ?? 0,
      warning: getTemplateWeekParityWarning(template, dateKey),
      hasTemplateDay: Boolean(templateDay),
    };
  });
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export default function ShiftPlanningDraftPreview({
  activeCinemaId,
  days,
  loading,
  month,
  templatesById,
  year,
  onOpenDay,
  onDraftPrepared,
}: ShiftPlanningDraftPreviewProps) {
  const infoDialog = useInfoModal();
  const [savingDraft, setSavingDraft] = useState(false);
  const [latestDraft, setLatestDraft] = useState<PreparedDraftSummary | null>(
    null,
  );

  const rows = getPreviewRows(days, templatesById);
  const prioritizedRows = getPrioritizedDraftPreviewRows(rows);
  const totalDraftShifts = rows.reduce(
    (sum, row) => sum + row.requiredCount,
    0,
  );
  const totalStandardAssignments = rows.reduce(
    (sum, row) => sum + row.assignedCount,
    0,
  );
  const totalEmptyDraftShifts = rows.reduce(
    (sum, row) => sum + row.emptyCount,
    0,
  );
  const warningCount = rows.filter((row) => row.warning).length;
  const missingTemplateDayCount = rows.filter((row) => !row.hasTemplateDay)
    .length;
  const visibleRows = prioritizedRows.slice(0, MAX_VISIBLE_DAYS);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);
  const hiddenAttentionCount = getHiddenDraftPreviewAttentionCount(
    visibleRows,
    prioritizedRows,
  );
  const canPrepareDraft = !loading && rows.length > 0 && Boolean(activeCinemaId);

  const prepareDraft = async () => {
    if (!activeCinemaId) {
      infoDialog.showError(
        "Kan ikke gemme forhåndsvisning",
        "Vælg en aktiv biograf, før du forbereder vagter.",
      );
      return;
    }

    try {
      setSavingDraft(true);
      const response = await apiFetch(
        appendCinemaId("/shift-planning-drafts/prepare", activeCinemaId),
        {
          method: "POST",
          body: JSON.stringify({
            year,
            month,
            cinemaId: activeCinemaId,
            note: `Forberedt fra månedsplanen for ${getMonthName(year, month)}`,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke gemme forhåndsvisning"),
        );
      }

      const draft = (await response.json()) as PreparedDraftSummary;
      setLatestDraft(draft);
      onDraftPrepared?.(draft);
      infoDialog.show({
        title: "Forhåndsvisning gemt",
        description: `Forhåndsvisning #${draft.id} er gemt med ${toNumber(
          draft.itemCount,
        )} vagter.\nDer er stadig ikke oprettet aktive vagter.\nÅbn kontrollen, gennemgå oprettelsesoverblikket og opret først derefter vagter.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme forhåndsvisning",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da forhåndsvisningen skulle gemmes.",
      );
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
              Forhåndsvisning
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              Forhåndsvis vagter
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
              Viser hvad månedens valgte skabeloner foreløbigt vil kunne blive
              til. Knappen gemmer en forhåndsvisning, men opretter stadig ingen
              aktive vagter i vagtplanen.
            </p>
          </div>
          <button
            type="button"
            onClick={prepareDraft}
            disabled={!canPrepareDraft || savingDraft}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {savingDraft ? "Gemmer forhåndsvisning..." : "Gem forhåndsvisning"}
          </button>
        </div>

        <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          En ny forhåndsvisning for samme måned erstatter den tidligere åbne
          forhåndsvisning, så du altid arbejder videre fra den nyeste version.
        </p>

        <div className="mt-5 space-y-4">
          <ShiftPlanningDraftPreviewStatusPanel
            latestDraft={latestDraft}
            loading={loading}
            rowCount={rows.length}
          />

          {!loading && rows.length > 0 && (
            <>
              <ShiftPlanningDraftPreviewMetricsPanel
                totalDraftShifts={totalDraftShifts}
                totalStandardAssignments={totalStandardAssignments}
                totalEmptyDraftShifts={totalEmptyDraftShifts}
                rowCount={rows.length}
              />

              <div className="space-y-3">
                {visibleRows.map((row) => (
                  <ShiftPlanningDraftPreviewRowCard
                    key={row.dateKey}
                    row={row}
                    onOpen={() => onOpenDay(row.day)}
                  />
                ))}
              </div>

              {(hiddenCount > 0 || warningCount > 0 || missingTemplateDayCount > 0) && (
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {hiddenCount > 0 && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                      {hiddenCount} øvrige dage ses i kalenderen nedenfor
                    </span>
                  )}
                  {hiddenAttentionCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-100">
                      {hiddenAttentionCount} skjulte dage kræver stadig tjek
                    </span>
                  )}
                  {hiddenCount > 0 && hiddenAttentionCount === 0 && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
                      De viste dage dækker alle kendte opmærksomhedspunkter
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-100">
                      {warningCount} dage med ugeadvarsel
                    </span>
                  )}
                  {missingTemplateDayCount > 0 && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-red-800 dark:bg-red-950 dark:text-red-100">
                      {missingTemplateDayCount} dage uden ugedagsopsætning
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
