import type { Dispatch, SetStateAction } from "react";

export type DraftStatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "OTHER";

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

type ShiftPlanningSavedDraftsListProps = {
  drafts: SavedDraftSummary[];
  loading: boolean;
  errorMessage: string | null;
  selectedDraftId: number | string | null;
  openingDraftId: number | string | null;
  draftStatusFilter: DraftStatusFilter;
  setDraftStatusFilter: Dispatch<SetStateAction<DraftStatusFilter>>;
  showAllDrafts: boolean;
  setShowAllDrafts: Dispatch<SetStateAction<boolean>>;
  onOpenDraft: (draftId: number | string) => void;
};

const DRAFT_STATUS_FILTERS: Array<{
  value: DraftStatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "Alle" },
  { value: "DRAFT", label: "Kladder" },
  { value: "PUBLISHED", label: "Publicerede" },
  { value: "SUPERSEDED", label: "Erstattede" },
  { value: "OTHER", label: "Andre" },
];

const MAX_VISIBLE_DRAFTS = 5;

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

function getDraftStatusFilterValue(status?: string | null): DraftStatusFilter {
  if (status === "DRAFT" || status === "PUBLISHED" || status === "SUPERSEDED") {
    return status;
  }

  return "OTHER";
}

function draftMatchesStatusFilter(
  draft: SavedDraftSummary,
  filter: DraftStatusFilter,
) {
  if (filter === "ALL") {
    return true;
  }

  return getDraftStatusFilterValue(draft.status) === filter;
}

function getDraftStatusCount(
  drafts: SavedDraftSummary[],
  filter: DraftStatusFilter,
) {
  if (filter === "ALL") {
    return drafts.length;
  }

  return drafts.filter((draft) => draftMatchesStatusFilter(draft, filter))
    .length;
}

function formatSelectedFilterText(filter: DraftStatusFilter) {
  switch (filter) {
    case "DRAFT":
      return "åbne kladder";
    case "PUBLISHED":
      return "publicerede kladder";
    case "SUPERSEDED":
      return "erstattede kladder";
    case "OTHER":
      return "andre kladder";
    default:
      return "kladder";
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

function getStatusClasses(status?: string | null) {
  if (status === "DRAFT") {
    return "bg-green-100 text-green-900 ring-green-200 dark:bg-green-950/60 dark:text-green-200 dark:ring-green-900";
  }

  if (status === "SUPERSEDED") {
    return "bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800";
  }

  return "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
}

export function ShiftPlanningSavedDraftsList({
  drafts,
  loading,
  errorMessage,
  selectedDraftId,
  openingDraftId,
  draftStatusFilter,
  setDraftStatusFilter,
  showAllDrafts,
  setShowAllDrafts,
  onOpenDraft,
}: ShiftPlanningSavedDraftsListProps) {
  const draftStatusCounts = DRAFT_STATUS_FILTERS.reduce(
    (counts, filter) => ({
      ...counts,
      [filter.value]: getDraftStatusCount(drafts, filter.value),
    }),
    {} as Record<DraftStatusFilter, number>,
  );

  const filteredDrafts = drafts.filter((draft) =>
    draftMatchesStatusFilter(draft, draftStatusFilter),
  );
  const visibleDrafts = showAllDrafts
    ? filteredDrafts
    : filteredDrafts.slice(0, MAX_VISIBLE_DRAFTS);
  const hiddenDraftCount = Math.max(
    0,
    filteredDrafts.length - visibleDrafts.length,
  );
  const canToggleDraftList = filteredDrafts.length > MAX_VISIBLE_DRAFTS;

  return (
    <>
      {drafts.length > 0 && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-center lg:text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Filtrér kladder
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Vælg om du vil fokusere på åbne, publicerede eller erstattede
                kladder.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
              {DRAFT_STATUS_FILTERS.map((filter) => {
                const isActive = draftStatusFilter === filter.value;
                const count = draftStatusCounts[filter.value] ?? 0;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setDraftStatusFilter(filter.value);
                      setShowAllDrafts(false);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                      isActive
                        ? "bg-blue-600 text-white ring-blue-600 dark:bg-blue-500 dark:ring-blue-500"
                        : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-800 dark:hover:bg-gray-800"
                    }`}
                  >
                    {filter.label} · {count}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          Henter gemte kladder...
        </div>
      )}

      {!loading && drafts.length === 0 && !errorMessage && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          Der er endnu ingen gemte kladder for måneden.
        </div>
      )}

      {!loading &&
        drafts.length > 0 &&
        filteredDrafts.length === 0 &&
        !errorMessage && (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
            Der er ingen {formatSelectedFilterText(draftStatusFilter)} i denne
            måned.
          </div>
        )}

      {!loading && visibleDrafts.length > 0 && (
        <div className="mt-5 grid gap-3">
          {visibleDrafts.map((draft) => {
            const isSelected =
              selectedDraftId !== null && String(selectedDraftId) === String(draft.id);

            return (
              <article
                key={draft.id}
                className={`rounded-2xl border p-4 ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                    : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                        Kladde #{draft.id}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClasses(
                          draft.status,
                        )}`}
                      >
                        {formatDraftStatus(draft.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Gemt {formatCreatedAt(draft.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-gray-900">
                        {toNumber(draft.itemCount)} poster
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-gray-900">
                        {toNumber(draft.unassignedItemCount)} uden standard
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-gray-900">
                        {toNumber(draft.warningItemCount)} advarsler
                      </span>
                    </div>
                    {draft.note && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                        {draft.note}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDraft(draft.id)}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
                    disabled={openingDraftId === draft.id}
                  >
                    {openingDraftId === draft.id ? "Åbner..." : "Åbn kladde"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {canToggleDraftList && (
        <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 sm:flex-row">
          <span>
            {showAllDrafts
              ? `Alle ${filteredDrafts.length} ${formatSelectedFilterText(
                  draftStatusFilter,
                )} vises.`
              : `${hiddenDraftCount} ældre ${formatSelectedFilterText(
                  draftStatusFilter,
                )} er skjult i den kompakte visning.`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllDrafts((current) => !current)}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-white dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
          >
            {showAllDrafts ? "Vis færre" : `Vis alle ${filteredDrafts.length}`}
          </button>
        </div>
      )}
    </>
  );
}
