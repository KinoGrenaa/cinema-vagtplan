type ProfileHeaderProps = {
  editing: boolean;
  onToggleEdit: () => void;
};

export default function ProfileHeader({
  editing,
  onToggleEdit,
}: ProfileHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold">Min profil</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Se og opdater dine medarbejderoplysninger.
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleEdit}
        className={
          editing
            ? "rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600"
            : "rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 active:bg-blue-800"
        }
      >
        {editing ? "Annuller" : "Rediger profil"}
      </button>
    </div>
  );
}
