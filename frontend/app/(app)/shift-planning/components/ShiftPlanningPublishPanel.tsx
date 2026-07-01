import { ShiftPlanningAlreadyPublishedPanel } from "./publish/ShiftPlanningAlreadyPublishedPanel";
import { ShiftPlanningPublishActionPanel } from "./publish/ShiftPlanningPublishActionPanel";
import { ShiftPlanningPublishChecklist } from "./publish/ShiftPlanningPublishChecklist";
import { ShiftPlanningPublishErrorPanel } from "./publish/ShiftPlanningPublishErrorPanel";
import { ShiftPlanningPublishFormFields } from "./publish/ShiftPlanningPublishFormFields";
import { ShiftPlanningPublishResultPanel } from "./publish/ShiftPlanningPublishResultPanel";
import { ShiftPlanningPublishStatusBadge } from "./publish/ShiftPlanningPublishStatusBadge";
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
          confirmationMatches={publishConfirmationMatches}
          confirmationText={PUBLISH_CONFIRMATION_TEXT}
          publicationPreviewIsGreen={publicationPreviewCanPublishLater}
          statusIsDraft={selectedDraftCanBePublished}
          workTypeSelected={Boolean(publishWorkTypeId)}
        />
      )}

      <ShiftPlanningPublishFormFields
        confirmationText={PUBLISH_CONFIRMATION_TEXT}
        loadingWorkTypes={loadingWorkTypes}
        publishConfirmationText={publishConfirmationText}
        publishNote={publishNote}
        publishWorkTypeId={publishWorkTypeId}
        publishing={publishing}
        selectedDraftCanBePublished={selectedDraftCanBePublished}
        setPublishConfirmationText={setPublishConfirmationText}
        setPublishNote={setPublishNote}
        setPublishWorkTypeId={setPublishWorkTypeId}
        workTypes={workTypes}
        workTypesError={workTypesError}
      />

      <ShiftPlanningPublishActionPanel
        canSubmitPublish={canSubmitPublish}
        onPublish={onPublish}
        publishing={publishing}
        selectedDraftIsPublished={selectedDraftIsPublished}
      />
    </div>
  );
}
