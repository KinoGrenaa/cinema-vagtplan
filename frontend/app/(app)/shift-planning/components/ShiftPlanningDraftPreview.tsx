import { useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import {
  appendCinemaId,
  formatDateKey,
  formatWeekParity,
  getMonthName,
  getMonthPlanDayDateKey,
  getTemplateDayAssignedCount,
  getTemplateDayForDate,
  getTemplateDayRequiredCount,
  getTemplateWeekParityWarning,
  getWeekdayName,
  readErrorMessage,
} from "../helpers/shiftPlanningHelpers";
import type {
  MonthPlanDay,
  ScheduleTemplateSummary,
} from "../helpers/shiftPlanningTypes";

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

type DraftPreviewRow = {
  day: MonthPlanDay;
  dateKey: string;
  template: ScheduleTemplateSummary | null;
  requiredCount: number;
  assignedCount: number;
  jobFunctionCount: number;
  warning: string | null;
  hasTemplateDay: boolean;
};

type PreparedDraftSummary = {
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

    return {
      day,
      dateKey,
      template,
      requiredCount: getTemplateDayRequiredCount(templateDay),
      assignedCount: getTemplateDayAssignedCount(templateDay),
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
  const totalDraftShifts = rows.reduce(
    (sum, row) => sum + row.requiredCount,
    0,
  );
  const totalStandardAssignments = rows.reduce(
    (sum, row) => sum + row.assignedCount,
    0,
  );
  const warningCount = rows.filter((row) => row.warning).length;
  const missingTemplateDayCount = rows.filter((row) => !row.hasTemplateDay).length;
  const visibleRows = rows.slice(0, MAX_VISIBLE_DAYS);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);
  const canPrepareDraft = !loading && rows.length > 0 && Boolean(activeCinemaId);

  const prepareDraft = async () => {
    if (!activeCinemaId) {
      infoDialog.showError(
        "Kan ikke gemme kladde",
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
        description: `Kladde #${draft.id} er gemt med ${toNumber(
          draft.itemCount,
        )} kladdeposter. Der er stadig ikke oprettet aktive vagter.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme planlægningskladde",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kladden skulle gemmes.",
      );
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/25">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Kladdepreview
          </p>
          <h2 className="mt-1 text-lg font-bold text-blue-950 dark:text-blue-100">
            Forbered vagter
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-blue-900 dark:text-blue-200">
            Viser hvad månedens valgte skabeloner foreløbigt vil kunne blive til.
            Knappen gemmer en planlægningskladde i backend, men opretter stadig
            ingen aktive vagter i vagtplanen.
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-blue-900 dark:text-blue-100">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-blue-200 dark:bg-blue-950 dark:ring-blue-800">
              {rows.length} dage med skabelon
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-blue-200 dark:bg-blue-950 dark:ring-blue-800">
              {totalDraftShifts} mulige vagter
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-blue-200 dark:bg-blue-950 dark:ring-blue-800">
              {totalStandardAssignments} standardmedarbejdere
            </span>
          </div>
          <button
            type="button"
            onClick={prepareDraft}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canPrepareDraft || savingDraft}
          >
            {savingDraft ? "Gemmer kladde..." : "Gem kladde"}
          </button>
          <p className="max-w-xs text-right text-xs text-blue-800 dark:text-blue-200">
            En ny kladde for samme måned erstatter tidligere åben kladde.
          </p>
        </div>
      </div>

      {latestDraft && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
          <span className="font-semibold">Seneste kladde #{latestDraft.id}</span>
          {" · "}
          {toNumber(latestDraft.itemCount)} poster
          {" · "}
          {toNumber(latestDraft.unassignedItemCount)} uden standardmedarbejder
          {" · "}
          {toNumber(latestDraft.warningItemCount)} med advarsel
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          Henter kladdepreview...
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          Ingen aktive dage har vagtsskabelon endnu. Læg først skabeloner på
          datoer, før måneden kan forberedes til kladder.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {visibleRows.map((row) => (
              <button
                key={row.dateKey || row.day.date}
                type="button"
                onClick={() => onOpenDay(row.day)}
                className="rounded-2xl border border-blue-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-blue-900/70 dark:bg-gray-950/70 dark:hover:border-blue-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-950 dark:text-white">
                      {getWeekdayName(row.dateKey, "long")} {formatDateKey(row.dateKey)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {row.template
                        ? `${row.template.name} · ${formatWeekParity(row.template.weekParity)}`
                        : "Skabelon mangler data"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-900 dark:bg-blue-900/70 dark:text-blue-100">
                    {row.requiredCount} vagter
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <span>{row.jobFunctionCount} funktioner</span>
                  <span>·</span>
                  <span>{row.assignedCount} standard</span>
                  {!row.hasTemplateDay && (
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      · ingen opsætning på ugedagen
                    </span>
                  )}
                  {row.warning && (
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      · ugeadvarsel
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {(hiddenCount > 0 || warningCount > 0 || missingTemplateDayCount > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-blue-900 dark:text-blue-100">
              {hiddenCount > 0 && (
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-blue-200 dark:bg-blue-950 dark:ring-blue-800">
                  {hiddenCount} flere dage ses i kalenderen
                </span>
              )}
              {warningCount > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900">
                  {warningCount} med ugeadvarsel
                </span>
              )}
              {missingTemplateDayCount > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900">
                  {missingTemplateDayCount} uden ugedagsopsætning
                </span>
              )}
            </div>
          )}
        </>
      )}

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </section>
  );
}
