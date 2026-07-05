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
        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
        disabled={saving}
      >
        Annuller
      </button>
      <button
        type="submit"
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
