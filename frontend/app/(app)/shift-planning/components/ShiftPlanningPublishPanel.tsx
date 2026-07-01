import { ShiftPlanningAlreadyPublishedPanel } from "./ShiftPlanningAlreadyPublishedPanel";
import { ShiftPlanningPublishActionPanel } from "./ShiftPlanningPublishActionPanel";
import { ShiftPlanningPublishChecklist } from "./ShiftPlanningPublishChecklist";
import { ShiftPlanningPublishResultPanel } from "./ShiftPlanningPublishResultPanel";

import { getSelectedWorkTypeName } from "../helpers/shiftPlanningDraftHelpers";
import type {
  DraftPublishResult,
  WorkTypeOption,
} from "../helpers/shiftPlanningDraftTypes";

export const PUBLISH_CONFIRMATION_TEXT = "PUBLICER_KLADDE";

type ShiftPlanningPublishPanelProps = {
  canSubmitPublish: boolean;
  loadingWorkTypes: boolean;
  onPublish: () => void;
  publicationPreviewCanPublishLater: boolean;
  publishConfirmationMatches: boolean;
  publishConfirmationText: string;
  publishError: string | null;
  publishNote: string;
  publishResult: DraftPublishResult | null;
  publishWorkTypeId: string;
  publishing: boolean;
  selectedDraftCanBePublished: boolean;
  selectedDraftIsPublished: boolean;
  setPublishConfirmationText: (value: string) => void;
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
  publishConfirmationMatches,
  publishConfirmationText,
  publishError,
  publishNote,
  publishResult,
  publishWorkTypeId,
  publishing,
  selectedDraftCanBePublished,
  selectedDraftIsPublished,
  setPublishConfirmationText,
  setPublishNote,
  setPublishWorkTypeId,
  workTypes,
  workTypesError,
}: ShiftPlanningPublishPanelProps) {
  const selectedWorkTypeName = getSelectedWorkTypeName(
    workTypes,
    publishWorkTypeId,
  );

  return (
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
              : selectedDraftCanBePublished && publicationPreviewCanPublishLater
                ? "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
                : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
          }`}
        >
          {selectedDraftIsPublished
            ? "Publiceret"
            : selectedDraftCanBePublished && publicationPreviewCanPublishLater
              ? "Kan bekræftes"
              : "Blokeret"}
        </span>
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
              loadingWorkTypes || publishing || !selectedDraftCanBePublished
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
            onChange={(event) => setPublishConfirmationText(event.target.value)}
            placeholder={PUBLISH_CONFIRMATION_TEXT}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            disabled={publishing || !selectedDraftCanBePublished}
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
          disabled={publishing || !selectedDraftCanBePublished}
        />
      </label>

      <ShiftPlanningPublishActionPanel
        canSubmitPublish={canSubmitPublish}
        onPublish={onPublish}
        publishing={publishing}
        selectedDraftIsPublished={selectedDraftIsPublished}
      />
    </div>
  );
}
