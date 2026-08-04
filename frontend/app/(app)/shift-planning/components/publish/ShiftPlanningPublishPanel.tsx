import { useMemo, useState } from "react";

import { ShiftPlanningAlreadyPublishedPanel } from "./ShiftPlanningAlreadyPublishedPanel";
import { ShiftPlanningPublishActionPanel } from "./ShiftPlanningPublishActionPanel";
import { ShiftPlanningPublishChecklist } from "./ShiftPlanningPublishChecklist";
import { ShiftPlanningPublishErrorPanel } from "./ShiftPlanningPublishErrorPanel";
import { ShiftPlanningPublishFormFields } from "./ShiftPlanningPublishFormFields";
import { ShiftPlanningPublishResultPanel } from "./ShiftPlanningPublishResultPanel";
import { ShiftPlanningPublishStatusBadge } from "./ShiftPlanningPublishStatusBadge";
import { getShiftPlanningPublishReadiness } from "../../helpers/shiftPlanningPublishReadiness";
import type { DraftPublishResult } from "../../helpers/shiftPlanningDraftTypes";

export const PUBLISH_CONFIRMATION_TEXT = "OPRET VAGTER";

type ShiftPlanningPublishPanelProps = {
  canSubmitPublish: boolean;
  onPublish: () => void;
  publicationPreviewCanPublishLater: boolean;
  publishError: string | null;
  publishNote: string;
  publishResult: DraftPublishResult | null;
  publishing: boolean;
  selectedDraftCanBePublished: boolean;
  selectedDraftIsPublished: boolean;
  setPublishNote: (value: string) => void;
};

export function ShiftPlanningPublishPanel({
  canSubmitPublish,
  onPublish,
  publicationPreviewCanPublishLater,
  publishError,
  publishNote,
  publishResult,
  publishing,
  selectedDraftCanBePublished,
  selectedDraftIsPublished,
  setPublishNote,
}: ShiftPlanningPublishPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canOpenConfirm =
    selectedDraftCanBePublished && !selectedDraftIsPublished && !publishing;

  const openConfirmBlockedReason = useMemo(() => {
    if (publishing) {
      return "Oprettelsen er allerede i gang.";
    }

    if (selectedDraftIsPublished) {
      return "Vagterne er allerede oprettet for dette forslag.";
    }

    if (!selectedDraftCanBePublished) {
      return "Forslaget er ikke åbent længere og kan derfor ikke oprettes.";
    }

    return null;
  }, [publishing, selectedDraftCanBePublished, selectedDraftIsPublished]);

  const publishReadiness = useMemo(
    () =>
      getShiftPlanningPublishReadiness({
        canSubmitPublish,
        publicationPreviewCanPublishLater,
        selectedDraftCanBePublished,
      }),
    [
      canSubmitPublish,
      publicationPreviewCanPublishLater,
      selectedDraftCanBePublished,
    ],
  );

  return (
    <div className="mt-5 rounded-2xl border border-red-200 bg-white p-4 dark:border-red-900/70 dark:bg-gray-950/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950 dark:text-white">
            Opret vagter
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Dette er sidste trin. Når du opretter vagterne, bliver de synlige
            i vagtplanen. Du får en bekræftelse, før noget oprettes.
          </p>
        </div>
        <ShiftPlanningPublishStatusBadge
          publicationPreviewCanPublishLater={publicationPreviewCanPublishLater}
          selectedDraftCanBePublished={selectedDraftCanBePublished}
          selectedDraftIsPublished={selectedDraftIsPublished}
        />
      </div>

      {publishResult && (
        <ShiftPlanningPublishResultPanel
          publishResult={publishResult}
          selectedJobFunctionName={
            publishResult.jobFunctionName ?? "Jobfunktionernes valgte typer"
          }
        />
      )}

      {selectedDraftIsPublished && !publishResult && (
        <ShiftPlanningAlreadyPublishedPanel />
      )}

      {publishError && <ShiftPlanningPublishErrorPanel message={publishError} />}

      {!selectedDraftIsPublished && (
        <ShiftPlanningPublishChecklist readiness={publishReadiness} />
      )}

      <ShiftPlanningPublishFormFields
        publishNote={publishNote}
        publishing={publishing}
        selectedDraftCanBePublished={selectedDraftCanBePublished}
        setPublishNote={setPublishNote}
      />

      <ShiftPlanningPublishActionPanel
        blockedReason={openConfirmBlockedReason}
        canOpenConfirm={canOpenConfirm}
        onOpenConfirm={() => setConfirmOpen(true)}
        publishing={publishing}
        selectedDraftIsPublished={selectedDraftIsPublished}
      />

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 text-gray-950 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
                  Sidste tjek
                </p>
                <h4 className="mt-2 text-xl font-bold">
                  Er du sikker på, at vagterne skal oprettes?
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                Luk
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Når du fortsætter, bliver vagterne oprettet i vagtplanen. Hver
              jobfunktion har en standardeksportkode, som er valgt under
              Jobfunktioner.
            </p>

            {publishReadiness.missingRequirements.length > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-semibold">Der mangler stadig noget</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {publishReadiness.missingRequirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 dark:active:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onPublish();
                }}
                disabled={!canSubmitPublish || publishing}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              >
                {publishing ? "Opretter vagter..." : "Ja, opret vagter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
