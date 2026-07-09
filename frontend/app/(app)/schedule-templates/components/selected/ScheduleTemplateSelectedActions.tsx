type ScheduleTemplateSelectedActionsProps = {
  isActive: boolean;
  copying: boolean;
  editing: boolean;
  onArchive: () => void;
  onReactivate: () => void;
  onCopyTemplate: () => void;
  onToggleEditing: () => void;
};

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
          className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
        >
          Arkivér
        </button>
      ) : (
        <button
          type="button"
          onClick={onReactivate}
          className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
        >
          Genaktivér
        </button>
      )}

      <button
        type="button"
        onClick={onCopyTemplate}
        className="rounded-2xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950/40"
        disabled={copying}
      >
        Kopiér skabelon
      </button>

      <button
        type="button"
        onClick={onToggleEditing}
        className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        {editing ? "Luk stamdata" : "Redigér stamdata"}
      </button>
    </div>
  );
}
