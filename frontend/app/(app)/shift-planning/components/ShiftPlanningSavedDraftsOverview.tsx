import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import { ShiftPlanningDraftItemsByDate } from "./ShiftPlanningDraftItemsByDate";
import { ShiftPlanningDraftValidationPanel } from "./ShiftPlanningDraftValidationPanel";
import { ShiftPlanningPublicationPreviewPanel } from "./ShiftPlanningPublicationPreviewPanel";
import {
  PUBLISH_CONFIRMATION_TEXT,
  ShiftPlanningPublishPanel,
} from "./ShiftPlanningPublishPanel";
import {
  ShiftPlanningSavedDraftsList,
  type DraftStatusFilter,
} from "./ShiftPlanningSavedDraftsList";

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
    formatMinute(item.plannedStartMinute) && formatMinute(item.plannedEndMinute),
  );
}

function itemHasJobFunction(item: SavedDraftItem) {
  return getItemJobFunctionName(item) !== "Jobfunktion mangler";
}

function itemHasTemplate(item: SavedDraftItem) {
  return getItemTemplateName(item) !== "Skabelon mangler";
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

  const selectedItems = selectedDraft?.items ?? [];
  const controlSummary = useMemo(
    () => getDraftControlSummary(selectedItems),
    [selectedItems],
  );
  const dateGroups = useMemo(
    () => getDateGroups(selectedItems),
    [selectedItems],
  );
  const draftNeedsControl = hasControlWarnings(controlSummary);
  const validationSummary = validationResult?.summary;
  const publicationPreviewSummary = publicationPreviewResult?.summary;
  const publicationPreviewCanPublishLater =
    publicationPreviewResult?.createsShifts === false &&
    publicationPreviewSummary?.canPublishLater === true;
  const selectedDraftIsPublished = selectedDraft?.status === "PUBLISHED";
  const selectedDraftCanBePublished = selectedDraft?.status === "DRAFT";
  const publishConfirmationMatches =
    publishConfirmationText.trim() === PUBLISH_CONFIRMATION_TEXT;
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


      <ShiftPlanningSavedDraftsList
        drafts={drafts}
        loading={loading}
        errorMessage={errorMessage}
        selectedDraftId={selectedDraft?.id ?? null}
        openingDraftId={openingDraftId}
        draftStatusFilter={draftStatusFilter}
        setDraftStatusFilter={setDraftStatusFilter}
        showAllDrafts={showAllDrafts}
        setShowAllDrafts={setShowAllDrafts}
        onOpenDraft={openDraft}
      />

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

          <ShiftPlanningPublishPanel
            canSubmitPublish={canSubmitPublish}
            loadingWorkTypes={loadingWorkTypes}
            onPublish={publishSelectedDraft}
            publicationPreviewCanPublishLater={
              publicationPreviewCanPublishLater
            }
            publishConfirmationMatches={publishConfirmationMatches}
            publishConfirmationText={publishConfirmationText}
            publishError={publishError}
            publishNote={publishNote}
            publishResult={publishResult}
            publishWorkTypeId={publishWorkTypeId}
            publishing={publishingDraftId === selectedDraft.id}
            selectedDraftCanBePublished={selectedDraftCanBePublished}
            selectedDraftIsPublished={selectedDraftIsPublished}
            setPublishConfirmationText={setPublishConfirmationText}
            setPublishNote={setPublishNote}
            setPublishWorkTypeId={setPublishWorkTypeId}
            workTypes={workTypes}
            workTypesError={workTypesError}
          />

          <ShiftPlanningDraftValidationPanel
            errorMessage={validationError}
            result={validationResult}
          />

          <ShiftPlanningDraftItemsByDate dateGroups={dateGroups} />
        </div>
      )}
    </section>
  );
}
