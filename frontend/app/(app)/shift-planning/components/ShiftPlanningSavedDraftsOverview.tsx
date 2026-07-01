import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import { ShiftPlanningPublicationPreviewPanel } from "./ShiftPlanningPublicationPreviewPanel";
import { ShiftPlanningPublishChecklist } from "./ShiftPlanningPublishChecklist";

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

type DraftValidationIssue = {
  id?: number | string | null;
  itemId?: number | string | null;
  date?: string | null;
  dateKey?: string | null;
  severity?: string | null;
  code?: string | null;
  message?: string | null;
  employeeName?: string | null;
  userName?: string | null;
  jobFunctionName?: string | null;
  details?: unknown;
};

type DraftValidationSummary = {
  isValid?: boolean;
  errorCount?: number | string | null;
  warningCount?: number | string | null;
  issueCount?: number | string | null;
};

type DraftValidationResult = {
  draftId?: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  checkedAt?: string | null;
  summary?: DraftValidationSummary | null;
  issues?: DraftValidationIssue[];
};

type DraftPublicationPreviewSummary = {
  canPublishLater?: boolean;
  itemCount?: number | string | null;
  publishableItemCount?: number | string | null;
  blockedItemCount?: number | string | null;
  validationErrorCount?: number | string | null;
  validationWarningCount?: number | string | null;
  validationIssueCount?: number | string | null;
};

type DraftPublicationPreviewItem = {
  draftItemId?: number | string | null;
  dateKey?: string | null;
  status?: string | null;
  jobFunctionName?: string | null;
  jobFunctionColor?: string | null;
  userName?: string | null;
  plannedStartMinute?: number | string | null;
  plannedEndMinute?: number | string | null;
  canBecomeShift?: boolean | null;
  blockReasons?: string[] | null;
  warningMessage?: string | null;
};

type DraftPublicationPreviewResult = {
  draftId?: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  checkedAt?: string | null;
  mode?: string | null;
  createsShifts?: boolean | null;
  summary?: DraftPublicationPreviewSummary | null;
  blockingReasons?: string[];
  validationSummary?: DraftValidationSummary | null;
  validationIssues?: DraftValidationIssue[];
  previewItems?: DraftPublicationPreviewItem[];
};

type WorkTypeOption = {
  id: number | string;
  name: string;
  color?: string | null;
  isActive?: boolean | null;
  archivedAt?: string | null;
};

type DraftPublishResult = {
  draftId?: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  mode?: string | null;
  createsShifts?: boolean | null;
  createdShiftCount?: number | string | null;
  createdShiftIds?: Array<number | string>;
  affectedDateKeys?: string[];
  workTypeId?: number | string | null;
  workTypeName?: string | null;
  publishedAt?: string | null;
  message?: string | null;
};

type ShiftPlanningSavedDraftsOverviewProps = {
  activeCinemaId: number | null;
  month: number;
  refreshKey: number;
  year: number;
  onDraftPublished?: () => Promise<void> | void;
};

type DraftStatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "SUPERSEDED" | "OTHER";

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
const MAX_VISIBLE_DATE_GROUPS = 10;
const MAX_VISIBLE_ITEMS_PER_DAY = 6;
const MAX_VISIBLE_VALIDATION_ISSUES = 20;
const PUBLISH_CONFIRMATION_TEXT = "PUBLICER_KLADDE";

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

function formatIssueDate(issue: DraftValidationIssue) {
  const dateKey = getDateKey(issue.dateKey || issue.date || null);
  return dateKey ? formatDateKey(dateKey) : null;
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

function formatValidationActor(issue: DraftValidationIssue) {
  return issue.employeeName || issue.userName || null;
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
  return Boolean(
    formatMinute(item.plannedStartMinute) &&
    formatMinute(item.plannedEndMinute),
  );
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

function getValidationSeverityLabel(severity?: string | null) {
  switch ((severity || "").toUpperCase()) {
    case "ERROR":
      return "Fejl";
    case "WARNING":
      return "Advarsel";
    case "INFO":
      return "Info";
    default:
      return severity || "Kontrol";
  }
}

function getValidationSeverityClasses(severity?: string | null) {
  switch ((severity || "").toUpperCase()) {
    case "ERROR":
      return "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100";
  }
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
    unassignedCount: items.filter(
      (item) => !item.userFirstName && !item.userLastName && !item.userEmail,
    ).length,
    warningCount: items.filter((item) =>
      Boolean(item.warningCode || item.warningMessage),
    ).length,
    missingTimeCount: items.filter((item) => !itemHasTime(item)).length,
    missingJobFunctionCount: items.filter((item) => !itemHasJobFunction(item))
      .length,
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
    const group = existingGroup ?? {
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
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ValidationMetricCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number | string;
  variant?: "neutral" | "warning" | "error" | "success";
}) {
  const numericValue = Number(value);
  const shouldHighlightProblem =
    !Number.isFinite(numericValue) || numericValue > 0;

  const classes =
    variant === "error" && shouldHighlightProblem
      ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
      : variant === "warning" && shouldHighlightProblem
        ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
        : variant === "success"
          ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
          : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function getSelectedWorkTypeName(
  workTypes: WorkTypeOption[],
  workTypeId: string,
) {
  const workType = workTypes.find((item) => String(item.id) === workTypeId);
  return workType?.name || "Valgt arbejdstype";
}

function formatCreatedShiftIds(ids?: Array<number | string>) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return null;
  }

  const visibleIds = ids.slice(0, 10).join(", ");
  const hiddenCount = Math.max(0, ids.length - 10);

  return hiddenCount > 0 ? `${visibleIds} + ${hiddenCount} flere` : visibleIds;
}

function formatAffectedDateLabels(dateKeys?: string[]) {
  if (!Array.isArray(dateKeys) || dateKeys.length === 0) {
    return [];
  }

  return Array.from(new Set(dateKeys))
    .filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
    .sort()
    .map((dateKey) => ({ dateKey, label: formatDateKey(dateKey) }));
}

export default function ShiftPlanningSavedDraftsOverview({
  activeCinemaId,
  month,
  refreshKey,
  year,
  onDraftPublished,
}: ShiftPlanningSavedDraftsOverviewProps) {
  const [drafts, setDrafts] = useState<SavedDraftSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingDraftId, setOpeningDraftId] = useState<number | string | null>(
    null,
  );
  const [selectedDraft, setSelectedDraft] = useState<SavedDraftDetails | null>(
    null,
  );
  const [validatingDraftId, setValidatingDraftId] = useState<
    number | string | null
  >(null);
  const [validationResult, setValidationResult] =
    useState<DraftValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadingPublicationPreviewId, setLoadingPublicationPreviewId] =
    useState<number | string | null>(null);
  const [publicationPreviewResult, setPublicationPreviewResult] =
    useState<DraftPublicationPreviewResult | null>(null);
  const [publicationPreviewError, setPublicationPreviewError] = useState<
    string | null
  >(null);
  const [workTypes, setWorkTypes] = useState<WorkTypeOption[]>([]);
  const [loadingWorkTypes, setLoadingWorkTypes] = useState(false);
  const [workTypesError, setWorkTypesError] = useState<string | null>(null);
  const [publishWorkTypeId, setPublishWorkTypeId] = useState("");
  const [publishConfirmationText, setPublishConfirmationText] = useState("");
  const [publishNote, setPublishNote] = useState("");
  const [publishingDraftId, setPublishingDraftId] = useState<
    number | string | null
  >(null);
  const [publishResult, setPublishResult] = useState<DraftPublishResult | null>(
    null,
  );
  const [publishError, setPublishError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftStatusFilter, setDraftStatusFilter] =
    useState<DraftStatusFilter>("ALL");
  const [showAllDrafts, setShowAllDrafts] = useState(false);

  const draftStatusCounts = useMemo(() => {
    return DRAFT_STATUS_FILTERS.reduce(
      (counts, filter) => ({
        ...counts,
        [filter.value]: getDraftStatusCount(drafts, filter.value),
      }),
      {} as Record<DraftStatusFilter, number>,
    );
  }, [drafts]);
  const filteredDrafts = useMemo(
    () =>
      drafts.filter((draft) =>
        draftMatchesStatusFilter(draft, draftStatusFilter),
      ),
    [draftStatusFilter, drafts],
  );
  const visibleDrafts = useMemo(
    () =>
      showAllDrafts
        ? filteredDrafts
        : filteredDrafts.slice(0, MAX_VISIBLE_DRAFTS),
    [filteredDrafts, showAllDrafts],
  );
  const hiddenDraftCount = Math.max(
    0,
    filteredDrafts.length - visibleDrafts.length,
  );
  const canToggleDraftList = filteredDrafts.length > MAX_VISIBLE_DRAFTS;
  const selectedItems = selectedDraft?.items ?? [];
  const controlSummary = useMemo(
    () => getDraftControlSummary(selectedItems),
    [selectedItems],
  );
  const dateGroups = useMemo(
    () => getDateGroups(selectedItems),
    [selectedItems],
  );
  const visibleDateGroups = dateGroups.slice(0, MAX_VISIBLE_DATE_GROUPS);
  const hiddenDateGroupCount = Math.max(
    0,
    dateGroups.length - visibleDateGroups.length,
  );
  const draftNeedsControl = hasControlWarnings(controlSummary);
  const validationSummary = validationResult?.summary;
  const validationIssues = validationResult?.issues ?? [];
  const visibleValidationIssues = validationIssues.slice(
    0,
    MAX_VISIBLE_VALIDATION_ISSUES,
  );
  const hiddenValidationIssueCount = Math.max(
    0,
    validationIssues.length - visibleValidationIssues.length,
  );
  const publicationPreviewSummary = publicationPreviewResult?.summary;
  const publicationPreviewCanPublishLater =
    publicationPreviewResult?.createsShifts === false &&
    publicationPreviewSummary?.canPublishLater === true;
  const selectedDraftIsPublished = selectedDraft?.status === "PUBLISHED";
  const selectedDraftCanBePublished = selectedDraft?.status === "DRAFT";
  const publishConfirmationMatches =
    publishConfirmationText.trim() === PUBLISH_CONFIRMATION_TEXT;
  const selectedWorkTypeName = getSelectedWorkTypeName(
    workTypes,
    publishWorkTypeId,
  );
  const publishedShiftIdsText = formatCreatedShiftIds(
    publishResult?.createdShiftIds,
  );
  const publishedAffectedDateLabels = formatAffectedDateLabels(
    publishResult?.affectedDateKeys,
  );
  const canSubmitPublish =
    Boolean(selectedDraft) &&
    selectedDraftCanBePublished &&
    publicationPreviewCanPublishLater &&
    Boolean(publishWorkTypeId) &&
    publishConfirmationMatches &&
    publishingDraftId !== selectedDraft?.id;
  const backendValidationIsGreen = Boolean(
    validationResult &&
    validationSummary?.isValid === true &&
    toNumber(validationSummary.errorCount) === 0 &&
    toNumber(validationSummary.warningCount) === 0 &&
    toNumber(validationSummary.issueCount) === 0,
  );
  const isReadyForFuturePublication =
    backendValidationIsGreen && !draftNeedsControl;

  const fetchDrafts = useCallback(async () => {
    if (!activeCinemaId) {
      setDrafts([]);
      setSelectedDraft(null);
      setValidationResult(null);
      setValidationError(null);
      setPublicationPreviewResult(null);
      setPublicationPreviewError(null);
      setPublishResult(null);
      setPublishError(null);
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

        return nextDrafts.some(
          (draft) => String(draft.id) === String(current.id),
        )
          ? current
          : null;
      });
    } catch (error) {
      setDrafts([]);
      setSelectedDraft(null);
      setValidationResult(null);
      setValidationError(null);
      setPublicationPreviewResult(null);
      setPublicationPreviewError(null);
      setPublishResult(null);
      setPublishError(null);
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

  const fetchWorkTypes = useCallback(async () => {
    if (!activeCinemaId) {
      setWorkTypes([]);
      setPublishWorkTypeId("");
      setWorkTypesError(null);
      return;
    }

    try {
      setLoadingWorkTypes(true);
      setWorkTypesError(null);

      const response = await apiFetch(
        appendCinemaId("/work-types?includeArchived=false", activeCinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente arbejdstyper"),
        );
      }

      const data = await response.json();
      const activeWorkTypes = Array.isArray(data)
        ? data.filter(
            (workType: WorkTypeOption) =>
              workType.isActive !== false && !workType.archivedAt,
          )
        : [];

      setWorkTypes(activeWorkTypes);
      setPublishWorkTypeId((current) =>
        activeWorkTypes.some(
          (workType: WorkTypeOption) => String(workType.id) === current,
        )
          ? current
          : "",
      );
    } catch (error) {
      setWorkTypes([]);
      setPublishWorkTypeId("");
      setWorkTypesError(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da arbejdstyperne skulle hentes.",
      );
    } finally {
      setLoadingWorkTypes(false);
    }
  }, [activeCinemaId]);

  useEffect(() => {
    fetchWorkTypes();
  }, [fetchWorkTypes]);

  const openDraft = async (draftId: number | string) => {
    if (!activeCinemaId) {
      setErrorMessage("Vælg en aktiv biograf, før du åbner kladder.");
      return;
    }

    try {
      setOpeningDraftId(draftId);
      setErrorMessage(null);
      setValidationResult(null);
      setValidationError(null);
      setPublicationPreviewResult(null);
      setPublicationPreviewError(null);
      setPublishResult(null);
      setPublishError(null);
      setPublishConfirmationText("");
      setPublishNote("");

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
      setValidationResult(null);
      setValidationError(null);
      setPublicationPreviewResult(null);
      setPublicationPreviewError(null);
      setPublishResult(null);
      setPublishError(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kladden skulle åbnes.",
      );
    } finally {
      setOpeningDraftId(null);
    }
  };

  const validateSelectedDraft = async () => {
    if (!selectedDraft) {
      setValidationError("Åbn en kladde, før du kører backend-validering.");
      return;
    }

    if (!activeCinemaId) {
      setValidationError("Vælg en aktiv biograf, før du validerer kladden.");
      return;
    }

    try {
      setValidatingDraftId(selectedDraft.id);
      setValidationError(null);

      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${selectedDraft.id}/validate`,
          activeCinemaId,
        ),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke validere planlægningskladden",
          ),
        );
      }

      setValidationResult((await response.json()) as DraftValidationResult);
    } catch (error) {
      setValidationResult(null);
      setValidationError(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kladden skulle valideres.",
      );
    } finally {
      setValidatingDraftId(null);
    }
  };

  const loadPublicationPreview = async () => {
    if (!selectedDraft) {
      setPublicationPreviewError(
        "Åbn en kladde, før du henter publiceringspreview.",
      );
      return;
    }

    if (!activeCinemaId) {
      setPublicationPreviewError(
        "Vælg en aktiv biograf, før du henter publiceringspreview.",
      );
      return;
    }

    try {
      setLoadingPublicationPreviewId(selectedDraft.id);
      setPublicationPreviewError(null);
      setPublishResult(null);
      setPublishError(null);

      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${selectedDraft.id}/publication-preview`,
          activeCinemaId,
        ),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente publiceringspreview",
          ),
        );
      }

      setPublicationPreviewResult(
        (await response.json()) as DraftPublicationPreviewResult,
      );
    } catch (error) {
      setPublicationPreviewResult(null);
      setPublicationPreviewError(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da publiceringspreview skulle hentes.",
      );
    } finally {
      setLoadingPublicationPreviewId(null);
    }
  };

  const publishSelectedDraft = async () => {
    if (!selectedDraft) {
      setPublishError("Åbn en kladde, før du publicerer.");
      return;
    }

    if (!activeCinemaId) {
      setPublishError("Vælg en aktiv biograf, før du publicerer kladden.");
      return;
    }

    if (!selectedDraftCanBePublished) {
      setPublishError("Kun kladder med status Kladde kan publiceres.");
      return;
    }

    if (!publicationPreviewCanPublishLater) {
      setPublishError(
        "Hent et grønt publiceringspreview, før kladden publiceres.",
      );
      return;
    }

    if (!publishWorkTypeId) {
      setPublishError("Vælg en arbejdstype til de vagter, der oprettes.");
      return;
    }

    if (!publishConfirmationMatches) {
      setPublishError(
        `Skriv ${PUBLISH_CONFIRMATION_TEXT} for at bekræfte publicering.`,
      );
      return;
    }

    try {
      setPublishingDraftId(selectedDraft.id);
      setPublishError(null);
      setPublishResult(null);

      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${selectedDraft.id}/publish`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({
            workTypeId: Number(publishWorkTypeId),
            confirm: PUBLISH_CONFIRMATION_TEXT,
            note: publishNote.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke publicere kladden"),
        );
      }

      const result = (await response.json()) as DraftPublishResult;
      setPublishResult(result);
      setSelectedDraft((current) =>
        current && String(current.id) === String(selectedDraft.id)
          ? {
              ...current,
              status: "PUBLISHED",
              updatedAt: result.publishedAt ?? current.updatedAt,
              items: current.items?.map((item) => ({
                ...item,
                status: "PUBLISHED",
              })),
            }
          : current,
      );
      setPublicationPreviewResult(null);
      setValidationResult(null);
      setDraftStatusFilter("PUBLISHED");
      setShowAllDrafts(false);
      setPublishConfirmationText("");
      setPublishNote("");
      await fetchDrafts();
      await onDraftPublished?.();
    } catch (error) {
      setPublishResult(null);
      setPublishError(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kladden skulle publiceres.",
      );
    } finally {
      setPublishingDraftId(null);
    }
  };

  const closeControl = () => {
    setSelectedDraft(null);
    setValidationResult(null);
    setValidationError(null);
    setPublicationPreviewResult(null);
    setPublicationPreviewError(null);
    setPublishResult(null);
    setPublishError(null);
    setPublishConfirmationText("");
    setPublishNote("");
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl text-center lg:mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
            Gemte kladder
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            Seneste kladder for {getMonthName(year, month)}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Kladderne ligger i backend og kan åbnes til kontrol. Publicering er
            låst bag validering, preview, arbejdstype og præcis bekræftelse.
          </p>
        </div>

        <div className="flex shrink-0 justify-center lg:absolute lg:right-5">
          <button
            type="button"
            onClick={fetchDrafts}
            className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-100 dark:hover:bg-blue-950/50"
            disabled={loading}
          >
            {loading ? "Opdaterer..." : "Opdater kladder"}
          </button>
        </div>
      </div>

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
              selectedDraft && String(selectedDraft.id) === String(draft.id);

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
                    onClick={() => openDraft(draft.id)}
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

      {selectedDraft && (
        <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-900/70 dark:bg-blue-950/25">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
                Kladdekontrol
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-gray-950 dark:text-white">
                  Kladde #{selectedDraft.id} · {controlSummary.totalItems}{" "}
                  poster
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClasses(
                    selectedDraft.status,
                  )}`}
                >
                  {formatDraftStatus(selectedDraft.status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Gennemgå poster, medarbejdere, tider, backend-validering og
                publiceringspreview. Publicering kræver stadig arbejdstype og
                præcis bekræftelse.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={validateSelectedDraft}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={validatingDraftId === selectedDraft.id}
              >
                {validatingDraftId === selectedDraft.id
                  ? "Validerer..."
                  : "Kør backend-validering"}
              </button>
              <button
                type="button"
                onClick={loadPublicationPreview}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
                disabled={loadingPublicationPreviewId === selectedDraft.id}
              >
                {loadingPublicationPreviewId === selectedDraft.id
                  ? "Henter preview..."
                  : "Hent publiceringspreview"}
              </button>
              <button
                type="button"
                onClick={closeControl}
                className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-100 dark:hover:bg-blue-900/40"
              >
                Luk kontrol
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <ControlMetricCard
              label="Poster"
              value={controlSummary.totalItems}
            />
            <ControlMetricCard
              label="Datoer"
              value={controlSummary.dateCount}
            />
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
              value={
                controlSummary.missingJobFunctionCount +
                controlSummary.missingTemplateCount
              }
              variant="warning"
            />
          </div>

          <div
            className={`mt-4 rounded-2xl border p-4 text-sm ${
              draftNeedsControl
                ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
                : "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
            }`}
          >
            <p className="font-semibold">
              {draftNeedsControl
                ? "Kræver kontrol før senere publicering"
                : "Ingen synlige kontroladvarsler i kladden"}
            </p>
            <p className="mt-1 opacity-85">
              {draftNeedsControl
                ? "Ret eller godkend afvigelserne bevidst, før vi senere bygger publicering til den rigtige vagtplan."
                : "Kladden ser umiddelbart klar ud til et senere publiceringstrin, når backend-valideringen også er grøn."}
            </p>
          </div>

          <div
            className={`mt-4 rounded-2xl border p-4 text-sm ${
              isReadyForFuturePublication
                ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
                : backendValidationIsGreen
                  ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
                  : "border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-200"
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                  Publiceringsklarhed
                </p>
                <p className="mt-2 text-base font-bold">
                  {isReadyForFuturePublication
                    ? "Klar til senere publicering"
                    : backendValidationIsGreen
                      ? "Backend-validering er grøn — gennemgå lokale kontroladvarsler"
                      : validationResult
                        ? "Ikke klar til publicering"
                        : validationError
                          ? "Ikke klar — backend-validering fejlede"
                          : "Ikke klar — kør backend-validering først"}
                </p>
                <p className="mt-1 opacity-85">
                  {isReadyForFuturePublication
                    ? "Kladden har grøn backend-validering og ingen synlige lokale kontroladvarsler. Selve publiceringen er stadig ikke bygget."
                    : backendValidationIsGreen
                      ? "Backend fandt ingen fejl eller advarsler, men kladden har lokale kontrolpunkter, som bør gennemgås før publicering bygges."
                      : validationResult
                        ? "Backend-valideringen skal være grøn, før kladden må vises som klar til publicering."
                        : validationError
                          ? "Ret fejlen eller prøv valideringen igen. Kladden kan ikke markeres klar uden en grøn backend-validering."
                          : "Klik på “Kør backend-validering”. En kladde kan først vises som klar, når backend-valideringen er kørt og er grøn."}
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  isReadyForFuturePublication
                    ? "bg-green-100 text-green-950 dark:bg-green-900/60 dark:text-green-100"
                    : backendValidationIsGreen
                      ? "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                {isReadyForFuturePublication
                  ? "Klar"
                  : backendValidationIsGreen
                    ? "Kontrol"
                    : "Blokeret"}
              </span>
            </div>
          </div>

          <ShiftPlanningPublicationPreviewPanel
            canPublishLater={publicationPreviewCanPublishLater}
            errorMessage={publicationPreviewError}
            result={publicationPreviewResult}
          />

          <div className="mt-5 rounded-2xl border border-red-200 bg-white p-4 dark:border-red-900/70 dark:bg-gray-950/70">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-950 dark:text-white">
                  Publicer kladde
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Dette er det første trin, der kan oprette rigtige vagter i
                  vagtplanen. Knappen kræver grønt publiceringspreview, aktiv
                  arbejdstype og præcis tekstbekræftelse.
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  selectedDraftIsPublished
                    ? "bg-green-100 text-green-950 dark:bg-green-900/60 dark:text-green-100"
                    : selectedDraftCanBePublished &&
                        publicationPreviewCanPublishLater
                      ? "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                {selectedDraftIsPublished
                  ? "Publiceret"
                  : selectedDraftCanBePublished &&
                      publicationPreviewCanPublishLater
                    ? "Kan bekræftes"
                    : "Blokeret"}
              </span>
            </div>

            {publishResult && (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold">
                      {publishResult.message ||
                        "Planlægningskladden er publiceret."}
                    </p>
                    <p className="mt-1 opacity-85">
                      Oprettede vagter:{" "}
                      {toNumber(publishResult.createdShiftCount)} · Arbejdstype:{" "}
                      {publishResult.workTypeName || selectedWorkTypeName}
                    </p>
                    {publishedShiftIdsText && (
                      <p className="mt-1 text-xs opacity-75">
                        Shift-id'er: {publishedShiftIdsText}
                      </p>
                    )}
                    {publishedAffectedDateLabels.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-green-200 bg-white/65 p-3 dark:border-green-900/70 dark:bg-green-950/30">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                          Opdaterede datoer i månedsplanen
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {publishedAffectedDateLabels.map((date) => (
                            <span
                              key={date.dateKey}
                              className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-950 dark:bg-green-900/70 dark:text-green-100"
                            >
                              {date.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="mt-2 text-xs font-semibold opacity-80">
                      Listen er skiftet til Publicerede kladder, så den
                      publicerede kladde kan kontrolleres med det samme.
                    </p>
                  </div>
                  <a
                    href="/schedule"
                    className="inline-flex w-fit rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-200 dark:text-green-950 dark:hover:bg-green-100"
                  >
                    Åbn vagtplan
                  </a>
                </div>
              </div>
            )}

            {selectedDraftIsPublished && !publishResult && (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
                <p className="font-semibold">
                  Denne kladde er allerede publiceret.
                </p>
                <p className="mt-1 opacity-85">
                  Den kan ikke publiceres igen. Åbn vagtplanen for at gennemgå
                  de oprettede vagter.
                </p>
                <a
                  href="/schedule"
                  className="mt-3 inline-flex rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-200 dark:text-green-950 dark:hover:bg-green-100"
                >
                  Åbn vagtplan
                </a>
              </div>
            )}

            {publishError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
                {publishError}
              </div>
            )}

            {!selectedDraftIsPublished && (
              <ShiftPlanningPublishChecklist
                allRequirementsMet={canSubmitPublish}
                confirmationMatches={publishConfirmationMatches}
                confirmationText={PUBLISH_CONFIRMATION_TEXT}
                publicationPreviewIsGreen={publicationPreviewCanPublishLater}
                statusIsDraft={selectedDraftCanBePublished}
                workTypeSelected={Boolean(publishWorkTypeId)}
              />
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Arbejdstype til oprettede vagter
                <select
                  value={publishWorkTypeId}
                  onChange={(event) => setPublishWorkTypeId(event.target.value)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  disabled={
                    loadingWorkTypes ||
                    publishingDraftId === selectedDraft.id ||
                    !selectedDraftCanBePublished
                  }
                >
                  <option value="">Vælg arbejdstype</option>
                  {workTypes.map((workType) => (
                    <option key={workType.id} value={String(workType.id)}>
                      {workType.name}
                    </option>
                  ))}
                </select>
                {loadingWorkTypes && (
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                    Henter arbejdstyper...
                  </span>
                )}
                {workTypesError && (
                  <span className="text-xs font-normal text-red-600 dark:text-red-300">
                    {workTypesError}
                  </span>
                )}
              </label>

              <label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Bekræft publicering
                <input
                  value={publishConfirmationText}
                  onChange={(event) =>
                    setPublishConfirmationText(event.target.value)
                  }
                  placeholder={PUBLISH_CONFIRMATION_TEXT}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  disabled={
                    publishingDraftId === selectedDraft.id ||
                    !selectedDraftCanBePublished
                  }
                />
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  Skriv {PUBLISH_CONFIRMATION_TEXT} for at låse knappen op.
                </span>
              </label>
            </div>

            <label className="mt-4 grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
              Intern note til vagterne
              <textarea
                value={publishNote}
                onChange={(event) => setPublishNote(event.target.value)}
                rows={2}
                placeholder="Valgfri note, fx publiceret fra månedsplan"
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                disabled={
                  publishingDraftId === selectedDraft.id ||
                  !selectedDraftCanBePublished
                }
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold">
                  Publicering opretter rigtige vagter.
                </p>
                <p className="mt-1 opacity-85">
                  Kør kun dette, når kladden er gennemgået,
                  publiceringspreviewet er grønt, og arbejdstypen er korrekt.
                </p>
              </div>
              <button
                type="button"
                onClick={publishSelectedDraft}
                disabled={!canSubmitPublish}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishingDraftId === selectedDraft.id
                  ? "Publicerer..."
                  : selectedDraftIsPublished
                    ? "Kladde er publiceret"
                    : "Publicer kladde"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900/70 dark:bg-gray-950/70">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-950 dark:text-white">
                  Backend-validering
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Kalder backendens sikre valideringsendpoint og kontrollerer
                  kladden uden at oprette eller publicere vagter.
                </p>
              </div>
              {validationResult?.checkedAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Senest kontrolleret{" "}
                  {formatCreatedAt(validationResult.checkedAt)}
                </p>
              )}
            </div>

            {validationError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
                {validationError}
              </div>
            )}

            {!validationResult && !validationError && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                Backend-validering er ikke kørt for den åbne kladde endnu.
              </div>
            )}

            {validationResult && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ValidationMetricCard
                    label="Status"
                    value={validationSummary?.isValid ? "OK" : "Stop"}
                    variant={validationSummary?.isValid ? "success" : "error"}
                  />
                  <ValidationMetricCard
                    label="Fejl"
                    value={toNumber(validationSummary?.errorCount)}
                    variant="error"
                  />
                  <ValidationMetricCard
                    label="Advarsler"
                    value={toNumber(validationSummary?.warningCount)}
                    variant="warning"
                  />
                  <ValidationMetricCard
                    label="Problemer"
                    value={toNumber(validationSummary?.issueCount)}
                    variant={
                      toNumber(validationSummary?.issueCount) > 0
                        ? "warning"
                        : "success"
                    }
                  />
                </div>

                {validationIssues.length === 0 && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
                    Backend-valideringen fandt ingen fejl eller advarsler i
                    kladden.
                  </div>
                )}

                {visibleValidationIssues.length > 0 && (
                  <div className="grid gap-3">
                    {visibleValidationIssues.map((issue, index) => {
                      const issueDate = formatIssueDate(issue);
                      const actor = formatValidationActor(issue);

                      return (
                        <article
                          key={`${issue.code ?? "issue"}-${issue.itemId ?? issue.id ?? index}`}
                          className={`rounded-2xl border p-4 text-sm ${getValidationSeverityClasses(
                            issue.severity,
                          )}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold dark:bg-gray-950/60">
                              {getValidationSeverityLabel(issue.severity)}
                            </span>
                            {issue.code && (
                              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold dark:bg-gray-950/60">
                                {issue.code}
                              </span>
                            )}
                            {issueDate && (
                              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold dark:bg-gray-950/60">
                                {issueDate}
                              </span>
                            )}
                            {issue.itemId && (
                              <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold dark:bg-gray-950/60">
                                Post #{issue.itemId}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 font-semibold">
                            {issue.message ||
                              issue.code ||
                              "Ukendt valideringsproblem"}
                          </p>
                          {(actor || issue.jobFunctionName) && (
                            <p className="mt-2 opacity-85">
                              {actor ? `Medarbejder: ${actor}` : null}
                              {actor && issue.jobFunctionName ? " · " : null}
                              {issue.jobFunctionName
                                ? `Jobfunktion: ${issue.jobFunctionName}`
                                : null}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                {hiddenValidationIssueCount > 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    {hiddenValidationIssueCount} flere valideringsproblemer er
                    skjult i denne kompakte visning.
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedItems.length === 0 && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              Kladden har ingen poster.
            </div>
          )}

          {visibleDateGroups.length > 0 && (
            <div className="mt-5 grid gap-4">
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
                  <section
                    key={group.dateKey || group.label}
                    className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-bold text-gray-950 dark:text-white">
                          {group.label}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {group.items.length} poster på datoen
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        {group.unassignedCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
                            {group.unassignedCount} ikke tildelt
                          </span>
                        )}
                        {group.warningCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
                            {group.warningCount} advarsler
                          </span>
                        )}
                        {group.missingTimeCount > 0 && (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-950 dark:bg-red-950/60 dark:text-red-100">
                            {group.missingTimeCount} uden tid
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {visibleItemsForDay.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-950 dark:text-white">
                                {formatTimeRange(item)}
                              </p>
                              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                                {item.jobFunctionColor && (
                                  <span
                                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                                    style={{
                                      backgroundColor: item.jobFunctionColor,
                                    }}
                                  />
                                )}
                                {getItemJobFunctionName(item)}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {getItemTemplateName(item)}
                              </p>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 lg:text-right">
                              Medarbejder: {formatUserName(item)}
                            </div>
                          </div>

                          {item.warningMessage && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                              Advarsel: {item.warningMessage}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>

                    {hiddenItemsForDay > 0 && (
                      <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        {hiddenItemsForDay} flere poster på datoen er skjult.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {hiddenDateGroupCount > 0 && (
            <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {hiddenDateGroupCount} flere datoer er skjult i denne kompakte
              kontrolvisning.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
