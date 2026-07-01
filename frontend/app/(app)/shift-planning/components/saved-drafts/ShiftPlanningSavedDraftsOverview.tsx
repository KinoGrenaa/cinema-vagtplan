import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import { ShiftPlanningDraftControlSummary } from "../draft-control/ShiftPlanningDraftControlSummary";
import { ShiftPlanningDraftControlHeader } from "../draft-control/ShiftPlanningDraftControlHeader";
import { ShiftPlanningDraftItemsByDate } from "../draft-items/ShiftPlanningDraftItemsByDate";
import { ShiftPlanningDraftValidationPanel } from "../draft-validation/ShiftPlanningDraftValidationPanel";
import { ShiftPlanningSavedDraftsHeader } from "./ShiftPlanningSavedDraftsHeader";
import { ShiftPlanningPublicationPreviewPanel } from "../publication-preview/ShiftPlanningPublicationPreviewPanel";
import {
  PUBLISH_CONFIRMATION_TEXT,
  ShiftPlanningPublishPanel,
} from "../publish/ShiftPlanningPublishPanel";
import {
  ShiftPlanningSavedDraftsList,
  type DraftStatusFilter,
} from "./ShiftPlanningSavedDraftsList";

import {
  appendCinemaId,
  readErrorMessage,
} from "../../helpers/shiftPlanningHelpers";
import {
  formatCreatedAt,
  getDateGroups,
  getDraftControlSummary,
  hasControlWarnings,
  toNumber,
} from "../../helpers/shiftPlanningDraftHelpers";
import type {
  DraftPublicationPreviewResult,
  DraftPublishResult,
  DraftValidationResult,
  MonthDraftResponse,
  SavedDraftDetails,
  SavedDraftSummary,
  WorkTypeOption,
} from "../../helpers/shiftPlanningDraftTypes";


type ShiftPlanningSavedDraftsOverviewProps = {
  activeCinemaId: number | null;
  month: number;
  refreshKey: number;
  year: number;
  onDraftPublished?: () => Promise<void> | void;
};



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
      setErrorMessage("Vælg en aktiv biograf, før du åbner planlægningskladder.");
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
          : "Der opstod en fejl, da planlægningskladden skulle åbnes.",
      );
    } finally {
      setOpeningDraftId(null);
    }
  };

  const validateSelectedDraft = async () => {
    if (!selectedDraft) {
      setValidationError("Åbn en planlægningskladde, før du kører backend-validering.");
      return;
    }

    if (!activeCinemaId) {
      setValidationError("Vælg en aktiv biograf, før du validerer planlægningskladden.");
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
          : "Der opstod en fejl, da planlægningskladden skulle valideres.",
      );
    } finally {
      setValidatingDraftId(null);
    }
  };

  const loadPublicationPreview = async () => {
    if (!selectedDraft) {
      setPublicationPreviewError(
        "Åbn en planlægningskladde, før du henter publiceringspreview.",
      );
      return;
    }

    if (!activeCinemaId) {
      setPublicationPreviewError(
        "Vælg en aktiv biograf, før du henter publiceringspreview for kladden.",
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
      setPublishError("Åbn en planlægningskladde, før du publicerer.");
      return;
    }

    if (!activeCinemaId) {
      setPublishError("Vælg en aktiv biograf, før du publicerer planlægningskladden.");
      return;
    }

    if (!selectedDraftCanBePublished) {
      setPublishError("Kun åbne kladder kan publiceres. Publicerede eller erstattede kladder er låst mod ny publicering.");
      return;
    }

    if (!publicationPreviewCanPublishLater) {
      setPublishError(
        "Hent et publiceringspreview uden blokerende fejl, før kladden publiceres.",
      );
      return;
    }

    if (!publishWorkTypeId) {
      setPublishError("Vælg den arbejdstype, som skal sættes på alle vagter ved publicering.");
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
          : "Der opstod en fejl, da planlægningskladden skulle publiceres.",
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
      <ShiftPlanningSavedDraftsHeader
        loading={loading}
        month={month}
        onRefresh={fetchDrafts}
        year={year}
      />


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
          <ShiftPlanningDraftControlHeader
            draftId={selectedDraft.id}
            draftStatus={selectedDraft.status}
            isLoadingPublicationPreview={
              loadingPublicationPreviewId === selectedDraft.id
            }
            isValidating={validatingDraftId === selectedDraft.id}
            onClose={closeControl}
            onLoadPublicationPreview={loadPublicationPreview}
            onValidate={validateSelectedDraft}
            totalItems={controlSummary.totalItems}
          />

          <ShiftPlanningDraftControlSummary
            backendValidationIsGreen={backendValidationIsGreen}
            controlSummary={controlSummary}
            draftNeedsControl={draftNeedsControl}
            hasValidationError={Boolean(validationError)}
            hasValidationResult={Boolean(validationResult)}
            isReadyForPublication={isReadyForFuturePublication}
          />

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
