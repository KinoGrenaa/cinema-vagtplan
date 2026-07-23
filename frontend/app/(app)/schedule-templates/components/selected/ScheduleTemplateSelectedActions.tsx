type ScheduleTemplateSelectedActionsProps = {
  isActive: boolean;
  copying: boolean;
  editing: boolean;
  onArchive: () => void;
  onReactivate: () => void;
  onCopyTemplate: () => void;
  onToggleEditing: () => void;
};

const focusClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function ScheduleTemplateSelectedActions({
  isActive,
  copying,
  editing,
  onArchive,
  onReactivate,
  onCopyTemplate,
  onToggleEditing,
}: ScheduleTemplateSelectedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {isActive ? (
        <button
          type="button"
          onClick={onArchive}
          className={`rounded-2xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 ${focusClasses}`}
        >
          Arkivér
        </button>
      ) : (
        <button
          type="button"
          onClick={onReactivate}
          className={`rounded-2xl bg-green-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-800 focus-visible:ring-green-600 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400 ${focusClasses}`}
        >
          Genaktivér
        </button>
      )}

      <button
        type="button"
        onClick={onCopyTemplate}
        className={`rounded-2xl border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-50 disabled:text-blue-400 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-200 dark:hover:bg-blue-950/40 dark:focus-visible:ring-blue-400 dark:disabled:border-blue-950 dark:disabled:bg-blue-950/20 dark:disabled:text-blue-500 ${focusClasses}`}
        disabled={copying}
      >
        {copying
          ? "Kopierer..."
          : "Kopiér skabelon"}
      </button>

      <button
        type="button"
        onClick={onToggleEditing}
        aria-pressed={editing}
        className={`rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 ${focusClasses}`}
      >
        {editing
          ? "Luk stamdata"
          : "Redigér stamdata"}
      </button>
    </div>
  );
}
