type ShiftPlanningPublishFormFieldsProps = {
  publishNote: string;
  publishing: boolean;
  selectedDraftCanBePublished: boolean;
  setPublishNote: (value: string) => void;
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
        onChange={(event) => setPublishNote(event.target.value)}
        rows={2}
        placeholder="Valgfri note til de oprettede vagter"
        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        disabled={publishing || !selectedDraftCanBePublished}
      />
      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
        Arbejdstype hentes automatisk fra jobfunktionens felt “Oprettes som”.
      </span>
    </label>
  );
}
