type ShiftPlanningPublishFormFieldsProps = {
  publishNote: string;
  publishing: boolean;
  selectedDraftCanBePublished: boolean;
  setPublishNote: (
    value: string,
  ) => void;
};

export function ShiftPlanningPublishFormFields({
  publishNote,
  publishing,
  selectedDraftCanBePublished,
  setPublishNote,
}: ShiftPlanningPublishFormFieldsProps) {
  return (
    <label className="mt-4 grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
      Note til oprettelsen

      <textarea
        value={publishNote}
        onChange={(event) =>
          setPublishNote(
            event.target.value,
          )
        }
        rows={2}
        placeholder="Valgfri note til de oprettede vagter"
        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        disabled={
          publishing ||
          !selectedDraftCanBePublished
        }
      />

      <span className="text-xs font-normal text-gray-600 dark:text-gray-300">
        Arbejdstype hentes automatisk
        fra jobfunktionens felt
        en standardeksportkode.
      </span>
    </label>
  );
}
