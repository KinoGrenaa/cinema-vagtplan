import { ShiftPlanningPublishChecklist } from "./ShiftPlanningPublishChecklist";

import { formatDateKey } from "../helpers/shiftPlanningHelpers";

export const PUBLISH_CONFIRMATION_TEXT = "PUBLICER_KLADDE";

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

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
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
  const publishedShiftIdsText = formatCreatedShiftIds(
    publishResult?.createdShiftIds,
  );
  const publishedAffectedDateLabels = formatAffectedDateLabels(
    publishResult?.affectedDateKeys,
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
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-semibold">
                {publishResult.message || "Planlægningskladden er publiceret."}
              </p>
              <p className="mt-1 opacity-85">
                Oprettede vagter: {toNumber(publishResult.createdShiftCount)} ·
                Arbejdstype:{" "}
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
                Listen er skiftet til Publicerede kladder, så den publicerede
                kladde kan kontrolleres med det samme.
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
          <p className="font-semibold">Denne kladde er allerede publiceret.</p>
          <p className="mt-1 opacity-85">
            Den kan ikke publiceres igen. Åbn vagtplanen for at gennemgå de
            oprettede vagter.
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

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold">Publicering opretter rigtige vagter.</p>
          <p className="mt-1 opacity-85">
            Kør kun dette, når kladden er gennemgået, publiceringspreviewet er
            grønt, og arbejdstypen er korrekt.
          </p>
        </div>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canSubmitPublish}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishing
            ? "Publicerer..."
            : selectedDraftIsPublished
              ? "Kladde er publiceret"
              : "Publicer kladde"}
        </button>
      </div>
    </div>
  );
}
