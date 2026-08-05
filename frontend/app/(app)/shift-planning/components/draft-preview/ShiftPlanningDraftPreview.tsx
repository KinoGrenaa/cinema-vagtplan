import { useState } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { ShiftPlanningDraftPreviewMetricsPanel } from "./ShiftPlanningDraftPreviewMetricsPanel";
import { ShiftPlanningDraftPreviewPrepareNotice } from "./ShiftPlanningDraftPreviewPrepareNotice";
import { ShiftPlanningDraftPreviewStatusPanel } from "./ShiftPlanningDraftPreviewStatusPanel";
import {
  getDraftPreviewPrepareButtonLabel,
  getDraftPreviewPrepareState,
} from "../../helpers/shiftPlanningDraftPreviewReadiness";
import { getPreparedDraftSuccessDescription } from "../../helpers/shiftPlanningPreparedDraftStatus";
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

export default function ShiftPlanningDraftPreview({
  activeCinemaId,
  days,
  loading,
  month,
  templatesById,
  year,
  onDraftPrepared,
}: ShiftPlanningDraftPreviewProps) {
  const infoDialog = useInfoModal();
  const [savingDraft, setSavingDraft] = useState(false);
  const [latestDraft, setLatestDraft] = useState<PreparedDraftSummary | null>(
    null,
  );
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
  const missingTemplateDayCount = rows.filter(
    (row) => !row.hasTemplateDay,
  ).length;
  const prepareState = getDraftPreviewPrepareState({
    activeCinemaId,
    emptyDraftShiftCount: totalEmptyDraftShifts,
    loading,
    missingTemplateDayCount,
    rowCount: rows.length,
    warningCount,
  });
  const canPrepareDraft = prepareState.canPrepareDraft;
  const prepareButtonLabel = getDraftPreviewPrepareButtonLabel(
    prepareState,
    savingDraft,
  );

  const prepareDraft = async () => {
    if (!activeCinemaId) {
      infoDialog.showError(
        "Kan ikke beregne vagtforslag",
        "Vælg en aktiv biograf, før du beregner vagter.",
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
            note:
              "Forberedt fra månedsplanen for " + getMonthName(year, month),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke beregne vagtforslag"),
        );
      }

      const draft = (await response.json()) as PreparedDraftSummary;
      setLatestDraft(draft);
      onDraftPrepared?.(draft);
      window.setTimeout(() => {
        document
          .getElementById("shift-planning-review")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      infoDialog.show({
        title: "Vagtforslag beregnet",
        description: getPreparedDraftSuccessDescription(draft),
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke beregne vagtforslag",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagtforslaget skulle beregnes.",
      );
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <>
      <section
        id="shift-planning-calculate"
        className="scroll-mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
              Trin 2
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              Beregn månedens vagtforslag
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Kalenderen ovenfor er planlægningsgrundlaget. Her beregnes én
              samlet kladde ud fra de valgte skabeloner, jobfunktionernes
              tidsregler og filmprogrammet.
            </p>
          </div>
          <button
            type="button"
            onClick={prepareDraft}
            disabled={!canPrepareDraft || savingDraft}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {prepareButtonLabel}
          </button>
        </div>

        <ShiftPlanningDraftPreviewMetricsPanel
          totalDraftShifts={totalDraftShifts}
          totalStandardAssignments={totalStandardAssignments}
          totalEmptyDraftShifts={totalEmptyDraftShifts}
          rowCount={rows.length}
        />

        <ShiftPlanningDraftPreviewPrepareNotice state={prepareState} />

        <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          Ret en dato ved at klikke direkte på den i kalenderen. Der vises ikke
          længere en ekstra datoliste her. Findes der allerede en åben kladde,
          genberegnes den og kan derfor beholde samme kladde-nummer.
        </p>

        <div className="mt-4">
          <ShiftPlanningDraftPreviewStatusPanel
            latestDraft={latestDraft}
            loading={loading}
            rowCount={rows.length}
          />
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
