type JobFunctionFormActionsProps = {
  isEditing: boolean;
  saving: boolean;
  onClose: () => void;
};

export default function JobFunctionFormActions({
  isEditing,
  saving,
  onClose,
}: JobFunctionFormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
        disabled={saving}
      >
        Annuller
      </button>
      <button
        type="submit"
        className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
        disabled={saving}
      >
        {saving
          ? "Gemmer..."
          : isEditing
            ? "Gem ændringer"
            : "Opret jobfunktion"}
      </button>
    </div>
  );
}
