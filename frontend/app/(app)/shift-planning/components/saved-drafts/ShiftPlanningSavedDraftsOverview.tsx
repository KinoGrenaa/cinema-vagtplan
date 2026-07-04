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
  const [draftPendingDelete, setDraftPendingDelete] =
    useState<SavedDraftSummary | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<
    number | string | null
  >(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
  const canSubmitPublish =
    Boolean(selectedDraft) &&
    selectedDraftCanBePublished &&
    publicationPreviewCanPublishLater &&
    publishingDraftId !== selectedDraft?.id;
  const controlValidationIsGreen = Boolean(
    validationResult &&
    validationSummary?.isValid === true &&
    toNumber(validationSummary.errorCount) === 0 &&
    toNumber(validationSummary.warningCount) === 0 &&
    toNumber(validationSummary.issueCount) === 0,
  );
  const isReadyForCreation =
    controlValidationIsGreen && !draftNeedsControl;

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
      setDraftPendingDelete(null);
      setDeleteError(null);
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
            "Kunne ikke hente forhåndsvisninger",
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
          : "Der opstod en fejl, da forhåndsvisningerne skulle hentes.",
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
      setErrorMessage("Vælg en aktiv biograf, før du åbner forhåndsvisninger.");
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
      setPublishNote("");

      const response = await apiFetch(
        appendCinemaId(`/shift-planning-drafts/${draftId}`, activeCinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke åbne forhåndsvisning",
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
          : "Der opstod en fejl, da forhåndsvisningen skulle åbnes.",
      );
    } finally {
      setOpeningDraftId(null);
    }
  };

  const requestDeleteDraft = (draft: SavedDraftSummary) => {
    if (String(draft.status ?? "").toUpperCase() === "PUBLISHED") {
      setDeleteError(
        "Forhåndsvisningen har allerede oprettet vagter og kan ikke slettes.",
      );
      return;
    }

    setDeleteError(null);
    setDraftPendingDelete(draft);
  };

  const confirmDeleteDraft = async () => {
    if (!draftPendingDelete) {
      return;
    }

    if (!activeCinemaId) {
      setDeleteError("Vælg en aktiv biograf, før du sletter forhåndsvisningen.");
      return;
    }

    try {
      setDeletingDraftId(draftPendingDelete.id);
      setDeleteError(null);

      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${draftPendingDelete.id}`,
          activeCinemaId,
        ),
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke slette forhåndsvisningen",
          ),
        );
      }

      const deletedDraftId = String(draftPendingDelete.id);

      if (String(selectedDraft?.id ?? "") === deletedDraftId) {
        setSelectedDraft(null);
        setValidationResult(null);
        setValidationError(null);
        setPublicationPreviewResult(null);
        setPublicationPreviewError(null);
        setPublishResult(null);
        setPublishError(null);
        setPublishNote("");
      }

      setDrafts((current) =>
        current.filter((draft) => String(draft.id) !== deletedDraftId),
      );
      setDraftPendingDelete(null);
      await fetchDrafts();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da forhåndsvisningen skulle slettes.",
      );
    } finally {
      setDeletingDraftId(null);
    }
  };

  const validateSelectedDraft = async () => {
    if (!selectedDraft) {
      setValidationError("Åbn en forhåndsvisning, før du kører kontrol.");
      return;
    }

    if (!activeCinemaId) {
      setValidationError("Vælg en aktiv biograf, før du kører kontrol på forhåndsvisningen.");
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
            "Kunne ikke køre kontrol på forhåndsvisningen",
          ),
        );
      }

      setValidationResult((await response.json()) as DraftValidationResult);
    } catch (error) {
      setValidationResult(null);
      setValidationError(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da forhåndsvisningen skulle kontrolleres.",
      );
    } finally {
      setValidatingDraftId(null);
    }
  };

  const loadPublicationPreview = async () => {
    if (!selectedDraft) {
      setPublicationPreviewError(
        "Åbn en forhåndsvisning, før du henter oprettelsesoverblik.",
      );
      return;
    }

    if (!activeCinemaId) {
      setPublicationPreviewError(
        "Vælg en aktiv biograf, før du henter oprettelsesoverblik.",
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
            "Kunne ikke hente oprettelsesoverblik",
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
          : "Der opstod en fejl, da oprettelsesoverbliket skulle hentes.",
      );
    } finally {
      setLoadingPublicationPreviewId(null);
    }
  };

  const publishSelectedDraft = async () => {
    if (!selectedDraft) {
      setPublishError("Åbn en forhåndsvisning, før du opretter vagter.");
      return;
    }

    if (!activeCinemaId) {
      setPublishError("Vælg en aktiv biograf, før du opretter vagter.");
      return;
    }

    if (!selectedDraftCanBePublished) {
      setPublishError("Kun åbne forslag kan oprette vagter. Oprettede eller erstattede forslag er låst mod ny oprettelse.");
      return;
    }

    if (!publicationPreviewCanPublishLater) {
      setPublishError(
        "Hent et oprettelsesoverblik uden blokerende fejl, før vagterne oprettes.",
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
            confirm: PUBLISH_CONFIRMATION_TEXT,
            note: publishNote.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette vagter"),
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
      setPublishNote("");
      await fetchDrafts();
      await onDraftPublished?.();
    } catch (error) {
      setPublishResult(null);
      setPublishError(
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagterne skulle oprettes.",
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
    setPublishNote("");
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <ShiftPlanningSavedDraftsHeader
        loading={loading}
        month={month}
        year={year}
      />


      <ShiftPlanningSavedDraftsList
        drafts={drafts}
        loading={loading}
        errorMessage={errorMessage}
        selectedDraftId={selectedDraft?.id ?? null}
        openingDraftId={openingDraftId}
        deletingDraftId={deletingDraftId}
        draftStatusFilter={draftStatusFilter}
        setDraftStatusFilter={setDraftStatusFilter}
        showAllDrafts={showAllDrafts}
        setShowAllDrafts={setShowAllDrafts}
        onDeleteDraft={requestDeleteDraft}
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
            controlValidationIsGreen={controlValidationIsGreen}
            controlSummary={controlSummary}
            draftNeedsControl={draftNeedsControl}
            hasValidationError={Boolean(validationError)}
            hasValidationResult={Boolean(validationResult)}
            isReadyForPublication={isReadyForCreation}
          />

          <ShiftPlanningPublicationPreviewPanel
            canPublishLater={publicationPreviewCanPublishLater}
            errorMessage={publicationPreviewError}
            result={publicationPreviewResult}
          />

          <ShiftPlanningPublishPanel
            canSubmitPublish={canSubmitPublish}
            onPublish={publishSelectedDraft}
            publicationPreviewCanPublishLater={
              publicationPreviewCanPublishLater
            }
            publishError={publishError}
            publishNote={publishNote}
            publishResult={publishResult}
            publishing={publishingDraftId === selectedDraft.id}
            selectedDraftCanBePublished={selectedDraftCanBePublished}
            selectedDraftIsPublished={selectedDraftIsPublished}
            setPublishNote={setPublishNote}
          />

          <ShiftPlanningDraftValidationPanel
            errorMessage={validationError}
            result={validationResult}
          />

          <ShiftPlanningDraftItemsByDate dateGroups={dateGroups} />
        </div>
      )}

      {draftPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-600 dark:text-red-300">
                Slet forhåndsvisning
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-gray-950 dark:text-gray-50">
                Slet forhåndsvisning #{draftPendingDelete.id}?
              </h3>
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Forhåndsvisningen fjernes fra listen. Der slettes ikke vagter i
              vagtplanen, fordi forhåndsvisningen ikke har oprettet vagter.
            </p>

            {deleteError && (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDraftPendingDelete(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                disabled={Boolean(deletingDraftId)}
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={confirmDeleteDraft}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={Boolean(deletingDraftId)}
              >
                {deletingDraftId ? "Sletter..." : "Ja, slet forhåndsvisning"}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
