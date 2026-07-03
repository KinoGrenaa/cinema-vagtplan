type ShiftPlanningSavedDraftsListMessagesProps = {
  errorMessage: string | null;
  hasAnyDrafts: boolean;
  hasMatchingDrafts: boolean;
  loading: boolean;
  selectedFilterText: string;
};

export function ShiftPlanningSavedDraftsListMessages({
  errorMessage,
  hasAnyDrafts,
  hasMatchingDrafts,
  loading,
  selectedFilterText,
}: ShiftPlanningSavedDraftsListMessagesProps) {
  return (
    <>
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          Henter gemte forhåndsvisninger...
        </div>
      )}

      {!loading && !hasAnyDrafts && !errorMessage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          Der er endnu ingen gemte forhåndsvisninger for måneden. Gem først en forhåndsvisning.
        </div>
      )}

      {!loading && hasAnyDrafts && !hasMatchingDrafts && !errorMessage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          Der er ingen {selectedFilterText} i denne måned. Skift filter eller gem en ny forhåndsvisning.
        </div>
      )}
    </>
  );
}
