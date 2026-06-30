import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  appendCinemaId,
  formatDateKey,
  getMonthName,
  readErrorMessage,
} from "../helpers/shiftPlanningHelpers";

type SavedDraftSummary = {
  id: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  source?: string | null;
  note?: string | null;
  warnings?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
  itemCount?: number | string | null;
  unassignedItemCount?: number | string | null;
  warningItemCount?: number | string | null;
};

type SavedDraftItem = {
  id: number | string;
  date?: string | null;
  status?: string | null;
  jobFunctionName?: string | null;
  jobFunctionColor?: string | null;
  scheduleTemplateName?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  userEmail?: string | null;
  plannedStartMinute?: number | string | null;
  plannedEndMinute?: number | string | null;
  warningCode?: string | null;
  warningMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SavedDraftDetails = SavedDraftSummary & {
  items?: SavedDraftItem[];
};

type MonthDraftResponse = {
  drafts?: SavedDraftSummary[];
};

type DraftDateGroup = {
  dateKey: string;
  label: string;
  items: SavedDraftItem[];
  unassignedCount: number;
  warningCount: number;
  missingTimeCount: number;
};

type DraftControlSummary = {
  totalItems: number;
  dateCount: number;
  unassignedCount: number;
  warningCount: number;
  missingTimeCount: number;
  missingJobFunctionCount: number;
  missingTemplateCount: number;
};

type ShiftPlanningSavedDraftsOverviewProps = {
  activeCinemaId: number | null;
  month: number;
  refreshKey: number;
  year: number;
};

const MAX_VISIBLE_DRAFTS = 5;
const MAX_VISIBLE_DATE_GROUPS = 10;
const MAX_VISIBLE_ITEMS_PER_DAY = 6;

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatDraftStatus(status?: string | null) {
  switch (status) {
    case "DRAFT":
      return "Kladde";
    case "SUPERSEDED":
      return "Erstattet";
    case "PUBLISHED":
      return "Publiceret";
    case "CANCELLED":
      return "Annulleret";
    default:
      return status || "Ukendt status";
  }
}

function formatCreatedAt(value?: string | null) {
  if (!value) {
    return "Ukendt tidspunkt";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getDateKey(value?: string | null) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatMinute(value: unknown) {
  const minute = Number(value);
  if (!Number.isInteger(minute) || minute < 0) {
    return null;
  }

  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeRange(item: SavedDraftItem) {
  const start = formatMinute(item.plannedStartMinute);
  const end = formatMinute(item.plannedEndMinute);

  if (!start || !end) {
    return "Tid mangler";
  }

  return `kl. ${start} - ${end}`;
}

function formatUserName(item: SavedDraftItem) {
  const name = `${item.userFirstName ?? ""} ${item.userLastName ?? ""}`.trim();
  return name || item.userEmail || "Ikke tildelt";
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getItemJobFunctionName(item: SavedDraftItem) {
  return (
    item.jobFunctionName ||
    getMetadataString(item.metadata, "jobFunctionName") ||
    "Jobfunktion mangler"
  );
}

function getItemTemplateName(item: SavedDraftItem) {
  return (
    item.scheduleTemplateName ||
    getMetadataString(item.metadata, "scheduleTemplateName") ||
    "Skabelon mangler"
  );
}

function itemHasTime(item: SavedDraftItem) {
  return Boolean(formatMinute(item.plannedStartMinute) && formatMinute(item.plannedEndMinute));
}

function itemHasJobFunction(item: SavedDraftItem) {
  return getItemJobFunctionName(item) !== "Jobfunktion mangler";
}

function itemHasTemplate(item: SavedDraftItem) {
  return getItemTemplateName(item) !== "Skabelon mangler";
}

function getStatusClasses(status?: string | null) {
  if (status === "DRAFT") {
    return "bg-green-100 text-green-900 ring-green-200 dark:bg-green-950/60 dark:text-green-200 dark:ring-green-900";
  }

  if (status === "SUPERSEDED") {
    return "bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800";
  }

  return "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
}

function getDraftControlSummary(items: SavedDraftItem[]): DraftControlSummary {
  const dateKeys = new Set<string>();

  items.forEach((item) => {
    const dateKey = getDateKey(item.date);
    if (dateKey) {
      dateKeys.add(dateKey);
    }
  });

  return {
    totalItems: items.length,
    dateCount: dateKeys.size,
    unassignedCount: items.filter((item) => !item.userFirstName && !item.userLastName && !item.userEmail).length,
    warningCount: items.filter((item) => Boolean(item.warningCode || item.warningMessage)).length,
    missingTimeCount: items.filter((item) => !itemHasTime(item)).length,
    missingJobFunctionCount: items.filter((item) => !itemHasJobFunction(item)).length,
    missingTemplateCount: items.filter((item) => !itemHasTemplate(item)).length,
  };
}

function hasControlWarnings(summary: DraftControlSummary) {
  return (
    summary.unassignedCount > 0 ||
    summary.warningCount > 0 ||
    summary.missingTimeCount > 0 ||
    summary.missingJobFunctionCount > 0 ||
    summary.missingTemplateCount > 0
  );
}

function getDateGroups(items: SavedDraftItem[]): DraftDateGroup[] {
  const groups = new Map<string, DraftDateGroup>();

  items.forEach((item) => {
    const dateKey = getDateKey(item.date);
    const groupKey = dateKey || "uden-dato";
    const existingGroup = groups.get(groupKey);
    const group =
      existingGroup ??
      {
        dateKey,
        label: dateKey ? formatDateKey(dateKey) : "Dato mangler",
        items: [],
        unassignedCount: 0,
        warningCount: 0,
        missingTimeCount: 0,
      };

    group.items.push(item);

    if (!item.userFirstName && !item.userLastName && !item.userEmail) {
      group.unassignedCount += 1;
    }

    if (item.warningCode || item.warningMessage) {
      group.warningCount += 1;
    }

    if (!itemHasTime(item)) {
      group.missingTimeCount += 1;
    }

    groups.set(groupKey, group);
  });

  return Array.from(groups.values());
}

function ControlMetricCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number;
  variant?: "neutral" | "warning" | "success";
}) {
  const classes =
    variant === "warning" && value > 0
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      : variant === "success"
        ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
        : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-2xl border p-3 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function ShiftPlanningSavedDraftsOverview({
  activeCinemaId,
  month,
  refreshKey,
  year,
}: ShiftPlanningSavedDraftsOverviewProps) {
  const [drafts, setDrafts] = useState<SavedDraftSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingDraftId, setOpeningDraftId] = useState<number | string | null>(
    null,
  );
  const [selectedDraft, setSelectedDraft] = useState<SavedDraftDetails | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleDrafts = useMemo(
    () => drafts.slice(0, MAX_VISIBLE_DRAFTS),
    [drafts],
  );
  const hiddenDraftCount = Math.max(0, drafts.length - visibleDrafts.length);
  const selectedItems = selectedDraft?.items ?? [];
  const controlSummary = useMemo(
    () => getDraftControlSummary(selectedItems),
    [selectedItems],
  );
  const dateGroups = useMemo(() => getDateGroups(selectedItems), [selectedItems]);
  const visibleDateGroups = dateGroups.slice(0, MAX_VISIBLE_DATE_GROUPS);
  const hiddenDateGroupCount = Math.max(0, dateGroups.length - visibleDateGroups.length);
  const draftNeedsControl = hasControlWarnings(controlSummary);

  const fetchDrafts = useCallback(async () => {
    if (!activeCinemaId) {
      setDrafts([]);
      setSelectedDraft(null);
      setErrorMessage(null);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts?year=${year}&month=${month}`,
          activeCinemaId,
        ),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente planlægningskladder",
          ),
        );
      }

      const data = (await response.json()) as MonthDraftResponse;
      const nextDrafts = Array.isArray(data.drafts) ? data.drafts : [];
      setDrafts(nextDrafts);
      setSelectedDraft((current) => {
        if (!current) {
          return null;
        }

        return nextDrafts.some((draft) => String(draft.id) === String(current.id))
          ? current
          : null;
      });
    } catch (error) {
      setDrafts([]);
      setSelectedDraft(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kladderne skulle hentes.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, month, year]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts, refreshKey]);

  const openDraft = async (draftId: number | string) => {
    if (!activeCinemaId) {
      setErrorMessage("Vælg en aktiv biograf, før du åbner kladder.");
      return;
    }

    try {
      setOpeningDraftId(draftId);
      setErrorMessage(null);
      const response = await apiFetch(
        appendCinemaId(`/shift-planning-drafts/${draftId}`, activeCinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke åbne planlægningskladde",
          ),
        );
      }

      setSelectedDraft((await response.json()) as SavedDraftDetails);
    } catch (error) {
      setSelectedDraft(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kladden skulle åbnes.",
      );
    } finally {
      setOpeningDraftId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="relative flex flex-col items-center gap-3 text-center lg:block">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Gemte kladder
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-950 dark:text-white">
            Seneste kladder for {getMonthName(year, month)}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Kladderne ligger i backend og kan åbnes til kontrol. De publiceres
            stadig ikke til den rigtige vagtplan herfra.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDrafts}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 lg:absolute lg:right-0 lg:top-0"
          disabled={loading || !activeCinemaId}
        >
          {loading ? "Opdaterer..." : "Opdater kladder"}
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Henter gemte kladder...
        </div>
      )}

      {!loading && drafts.length === 0 && !errorMessage && (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Der er endnu ingen gemte kladder for måneden.
        </div>
      )}

      {!loading && visibleDrafts.length > 0 && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visibleDrafts.map((draft) => {
            const isSelected =
              selectedDraft && String(selectedDraft.id) === String(draft.id);
            return (
              <div
                key={draft.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                    : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-950 dark:text-white">
                      Kladde #{draft.id}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      Gemt {formatCreatedAt(draft.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ring-1 ${getStatusClasses(
                      draft.status,
                    )}`}
                  >
                    {formatDraftStatus(draft.status)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
                    {toNumber(draft.itemCount)} poster
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
                    {toNumber(draft.unassignedItemCount)} uden standard
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
                    {toNumber(draft.warningItemCount)} advarsler
                  </span>
                </div>

                {draft.note && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    {draft.note}
                  </p>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openDraft(draft.id)}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
                    disabled={openingDraftId === draft.id}
                  >
                    {openingDraftId === draft.id ? "Åbner..." : "Åbn kladde"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hiddenDraftCount > 0 && (
        <p className="mt-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
          {hiddenDraftCount} ældre kladder er skjult i denne kompakte visning.
        </p>
      )}

      {selectedDraft && (
        <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/25">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Kladdekontrol
              </p>
              <h3 className="mt-1 text-lg font-bold text-blue-950 dark:text-blue-100">
                Kladde #{selectedDraft.id} · {controlSummary.totalItems} poster
              </h3>
              <p className="mt-1 max-w-3xl text-sm text-blue-900 dark:text-blue-200">
                Gennemgå poster, medarbejdere, tider og advarsler før et senere
                publiceringstrin. Denne kontrolvisning publicerer ikke vagter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDraft(null)}
              className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-100 dark:hover:bg-blue-900/40"
            >
              Luk kontrol
            </button>
          </div>

          <div
            className={`mt-4 rounded-2xl border p-4 ${
              draftNeedsControl
                ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
                : "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
            }`}
          >
            <p className="text-sm font-bold">
              {draftNeedsControl
                ? "Kræver kontrol før senere publicering"
                : "Ingen synlige kontroladvarsler i kladden"}
            </p>
            <p className="mt-1 text-sm opacity-90">
              {draftNeedsControl
                ? "Ret eller godkend afvigelserne bevidst, før vi senere bygger publicering til den rigtige vagtplan."
                : "Kladden ser umiddelbart klar ud til et senere publiceringstrin, når det bliver bygget."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ControlMetricCard
              label="Poster"
              value={controlSummary.totalItems}
              variant="success"
            />
            <ControlMetricCard label="Datoer" value={controlSummary.dateCount} />
            <ControlMetricCard
              label="Ikke tildelt"
              value={controlSummary.unassignedCount}
              variant="warning"
            />
            <ControlMetricCard
              label="Advarsler"
              value={controlSummary.warningCount}
              variant="warning"
            />
            <ControlMetricCard
              label="Tid mangler"
              value={controlSummary.missingTimeCount}
              variant="warning"
            />
            <ControlMetricCard
              label="Data mangler"
              value={controlSummary.missingJobFunctionCount + controlSummary.missingTemplateCount}
              variant="warning"
            />
          </div>

          {selectedItems.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              Kladden har ingen poster.
            </div>
          )}

          {visibleDateGroups.length > 0 && (
            <div className="mt-4 space-y-3">
              {visibleDateGroups.map((group) => {
                const visibleItemsForDay = group.items.slice(
                  0,
                  MAX_VISIBLE_ITEMS_PER_DAY,
                );
                const hiddenItemsForDay = Math.max(
                  0,
                  group.items.length - visibleItemsForDay.length,
                );

                return (
                  <div
                    key={group.dateKey || group.label}
                    className="rounded-2xl border border-blue-200 bg-white p-3 shadow-sm dark:border-blue-900/70 dark:bg-gray-950/70"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-950 dark:text-white">
                          {group.label}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {group.items.length} poster på datoen
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        {group.unassignedCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900">
                            {group.unassignedCount} ikke tildelt
                          </span>
                        )}
                        {group.warningCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900">
                            {group.warningCount} advarsler
                          </span>
                        )}
                        {group.missingTimeCount > 0 && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-red-900 ring-1 ring-red-200 dark:bg-red-950/60 dark:text-red-200 dark:ring-red-900">
                            {group.missingTimeCount} uden tid
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                      {visibleItemsForDay.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-2 border-b border-gray-200 p-3 text-sm last:border-b-0 dark:border-gray-800 lg:grid-cols-[8rem_1fr_1fr] lg:items-center"
                        >
                          <div className="font-semibold text-gray-950 dark:text-white">
                            {formatTimeRange(item)}
                          </div>
                          <div>
                            <p className="flex items-center gap-2 font-semibold text-gray-950 dark:text-white">
                              {item.jobFunctionColor && (
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: item.jobFunctionColor }}
                                />
                              )}
                              {getItemJobFunctionName(item)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                              {getItemTemplateName(item)}
                            </p>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 lg:text-right">
                            <p>
                              Medarbejder: <span className="font-semibold">{formatUserName(item)}</span>
                            </p>
                            {item.warningMessage && (
                              <p className="font-semibold text-amber-700 dark:text-amber-300">
                                Advarsel: {item.warningMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {hiddenItemsForDay > 0 && (
                      <p className="mt-2 text-xs font-semibold text-blue-900 dark:text-blue-100">
                        {hiddenItemsForDay} flere poster på datoen er skjult.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hiddenDateGroupCount > 0 && (
            <p className="mt-3 text-xs font-semibold text-blue-900 dark:text-blue-100">
              {hiddenDateGroupCount} flere datoer er skjult i denne kompakte kontrolvisning.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
