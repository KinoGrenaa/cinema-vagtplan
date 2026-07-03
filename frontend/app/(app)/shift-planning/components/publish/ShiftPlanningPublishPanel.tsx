import { useMemo, useState } from "react";

import { ShiftPlanningAlreadyPublishedPanel } from "./ShiftPlanningAlreadyPublishedPanel";
import { ShiftPlanningPublishActionPanel } from "./ShiftPlanningPublishActionPanel";
import { ShiftPlanningPublishChecklist } from "./ShiftPlanningPublishChecklist";
import { ShiftPlanningPublishErrorPanel } from "./ShiftPlanningPublishErrorPanel";
import { ShiftPlanningPublishFormFields } from "./ShiftPlanningPublishFormFields";
import { ShiftPlanningPublishResultPanel } from "./ShiftPlanningPublishResultPanel";
import { ShiftPlanningPublishStatusBadge } from "./ShiftPlanningPublishStatusBadge";
import { getSelectedWorkTypeName } from "../../helpers/shiftPlanningDraftHelpers";
import type {
  DraftPublishResult,
  WorkTypeOption,
} from "../../helpers/shiftPlanningDraftTypes";

export const PUBLISH_CONFIRMATION_TEXT = "OPRET VAGTER";

type ShiftPlanningPublishPanelProps = {
  canSubmitPublish: boolean;
  loadingWorkTypes: boolean;
  onPublish: () => void;
  publicationPreviewCanPublishLater: boolean;
  publishError: string | null;
  publishNote: string;
  publishResult: DraftPublishResult | null;
  publishWorkTypeId: string;
  publishing: boolean;
  selectedDraftCanBePublished: boolean;
  selectedDraftIsPublished: boolean;
  setPublishNote: (value: string) => void;
  setPublishWorkTypeId: (value: string) => void;
  workTypes: WorkTypeOption[];
  workTypesError: string | null;
};

export function ShiftPlanningPublishPanel({
  canSubmitPublish,
  loadingWorkTypes,
  onPublish,
  publicationPreviewCanPublishLater,
  publishError,
  publishNote,
  publishResult,
  publishWorkTypeId,
  publishing,
  selectedDraftCanBePublished,
  selectedDraftIsPublished,
  setPublishNote,
  setPublishWorkTypeId,
  workTypes,
  workTypesError,
}: ShiftPlanningPublishPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectedWorkTypeName = getSelectedWorkTypeName(
    workTypes,
    publishWorkTypeId,
  );
  const canOpenConfirm =
    selectedDraftCanBePublished && !selectedDraftIsPublished && !publishing;
  const missingRequirements = useMemo(() => {
    const missing: string[] = [];

    if (!selectedDraftCanBePublished) {
      missing.push("Forslaget er ikke åbent længere.");
    }

    if (!publicationPreviewCanPublishLater) {
      missing.push("Kontrollér og se vagterne først.");
    }

    if (!publishWorkTypeId) {
      missing.push("Vælg arbejdstype til de nye vagter.");
    }

    return missing;
  }, [publicationPreviewCanPublishLater, publishWorkTypeId, selectedDraftCanBePublished]);

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
          selectedWorkTypeName={selectedWorkTypeName}
        />
      )}

      {selectedDraftIsPublished && !publishResult && (
        <ShiftPlanningAlreadyPublishedPanel />
      )}

      {publishError && (
        <ShiftPlanningPublishErrorPanel message={publishError} />
      )}

      {!selectedDraftIsPublished && (
        <ShiftPlanningPublishChecklist
          allRequirementsMet={canSubmitPublish}
          creationOverviewIsGreen={publicationPreviewCanPublishLater}
          statusIsDraft={selectedDraftCanBePublished}
          workTypeSelected={Boolean(publishWorkTypeId)}
        />
      )}

      <ShiftPlanningPublishFormFields
        loadingWorkTypes={loadingWorkTypes}
        publishNote={publishNote}
        publishWorkTypeId={publishWorkTypeId}
        publishing={publishing}
        selectedDraftCanBePublished={selectedDraftCanBePublished}
        setPublishNote={setPublishNote}
        setPublishWorkTypeId={setPublishWorkTypeId}
        workTypes={workTypes}
        workTypesError={workTypesError}
      />

      <ShiftPlanningPublishActionPanel
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
              Når du fortsætter, bliver vagterne oprettet i vagtplanen med den
              valgte arbejdstype. Det kan ikke bruges til at oprette samme
              forslag to gange.
            </p>

            {missingRequirements.length > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-semibold">Der mangler stadig noget</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {missingRequirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
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
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
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
