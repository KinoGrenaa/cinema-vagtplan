import type { WorkTypeOption } from "../helpers/shiftPlanningDraftTypes";

type ShiftPlanningPublishFormFieldsProps = {
  confirmationText: string;
  loadingWorkTypes: boolean;
  publishConfirmationText: string;
  publishNote: string;
  publishWorkTypeId: string;
  publishing: boolean;
  selectedDraftCanBePublished: boolean;
  setPublishConfirmationText: (value: string) => void;
  setPublishNote: (value: string) => void;
  setPublishWorkTypeId: (value: string) => void;
  workTypes: WorkTypeOption[];
  workTypesError: string | null;
};

export function ShiftPlanningPublishFormFields({
  confirmationText,
  loadingWorkTypes,
  publishConfirmationText,
  publishNote,
  publishWorkTypeId,
  publishing,
  selectedDraftCanBePublished,
  setPublishConfirmationText,
  setPublishNote,
  setPublishWorkTypeId,
  workTypes,
  workTypesError,
}: ShiftPlanningPublishFormFieldsProps) {
  return (
    <>
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
            placeholder={confirmationText}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            disabled={publishing || !selectedDraftCanBePublished}
          />
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            Skriv {confirmationText} for at låse knappen op.
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
    </>
  );
}
