import { useState } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import { ShiftPlanningDraftPreviewMetricsPanel } from "./ShiftPlanningDraftPreviewMetricsPanel";
import { ShiftPlanningDraftPreviewRowCard } from "./ShiftPlanningDraftPreviewRowCard";
import { ShiftPlanningDraftPreviewStatusPanel } from "./ShiftPlanningDraftPreviewStatusPanel";

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
  templatesById: Map<number, ScheduleTemplateSummary>;
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
  templatesById: Map<number, ScheduleTemplateSummary>,
): DraftPreviewRow[] {
  return days.map((day) => {
    const dateKey = getMonthPlanDayDateKey(day);
    const template = day.scheduleTemplateId
      ? templatesById.get(day.scheduleTemplateId) ?? day.scheduleTemplate
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
  const [latestDraft, setLatestDraft] =
    useState<PreparedDraftSummary | null>(null);

  const rows = getPreviewRows(days, templatesById);
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
  const visibleRows = rows.slice(0, MAX_VISIBLE_DAYS);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);

  const canPrepareDraft = !loading && rows.length > 0 && Boolean(activeCinemaId);

  const prepareDraft = async () => {
    if (!activeCinemaId) {
      infoDialog.showError(
        "Kan ikke gemme forhÃ¥ndsvisning",
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
          await readErrorMessage(response, "Kunne ikke gemme planlægningskladde"),
        );
      }

      const draft = (await response.json()) as PreparedDraftSummary;
      setLatestDraft(draft);
      onDraftPrepared?.(draft);
      infoDialog.show({
        title: "Planlægningskladde gemt",
        description: `ForhÃ¥ndsvisning #${draft.id} er gemt med ${toNumber(
          draft.itemCount,
        )} kladdeposter.\nDer er stadig ikke oprettet aktive vagter. Kør kladdekontrol og publiceringspreview, før kladden publiceres.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme planlægningskladde",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da forhÃ¥ndsvisningen skulle gemmes.",
      );
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <>
      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />

      <section className="rounded-3xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/20 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              ForhÃ¥ndsvisning
            </p>
            <h2 className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
              Forbered månedens vagter
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Viser hvad månedens valgte skabeloner foreløbigt vil kunne blive
              til. Knappen gemmer en planlægningskladde i backend, men opretter
              stadig ingen aktive vagter i vagtplanen.
            </p>
            <ShiftPlanningDraftPreviewMetricsPanel
              rowCount={rows.length}
              totalDraftShifts={totalDraftShifts}
              totalStandardAssignments={totalStandardAssignments}
              totalEmptyDraftShifts={totalEmptyDraftShifts}
            />
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <button
              type="button"
              onClick={prepareDraft}
              disabled={!canPrepareDraft || savingDraft}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              {savingDraft ? "Gemmer planlægningskladde..." : "Gem planlægningskladde"}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              En ny planlægningskladde for samme måned erstatter tidligere åben kladde, så du altid arbejder videre fra den nyeste version.
            </p>
          </div>
        </div>

        <ShiftPlanningDraftPreviewStatusPanel
          latestDraft={latestDraft}
          loading={loading}
          rowCount={rows.length}
        />

        {!loading && rows.length > 0 && (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleRows.map((row) => (
                <ShiftPlanningDraftPreviewRowCard
                  key={row.dateKey || String(row.day.id ?? row.day.date)}
                  row={row}
                  onOpen={() => onOpenDay(row.day)}
                />
              ))}
            </div>

            {(hiddenCount > 0 || warningCount > 0 || missingTemplateDayCount > 0) && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                {hiddenCount > 0 && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-900">
                    {hiddenCount} flere dage ses i kalenderen nedenfor
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    {warningCount} dage med ugeadvarsel
                  </span>
                )}
                {missingTemplateDayCount > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-900 dark:bg-red-950/40 dark:text-red-100">
                    {missingTemplateDayCount} dage uden ugedagsopsætning
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
