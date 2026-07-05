type JobFunctionFormModalHeaderProps = {
  isEditing: boolean;
  saving: boolean;
  onClose: () => void;
};

export default function JobFunctionFormModalHeader({
  isEditing,
  saving,
  onClose,
}: JobFunctionFormModalHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Stamdata
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
          {isEditing ? "Redigér jobfunktion" : "Opret jobfunktion"}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Angiv navn, beskrivelse, farve og hvilken løntype vagter skal oprettes
          som.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
        disabled={saving}
      >
        Luk
      </button>
    </div>
  );
}
