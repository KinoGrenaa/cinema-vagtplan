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
        onClick={onToggleEdit}
        className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
      >
        {editing ? "Annuller" : "Rediger profil"}
      </button>
    </div>
  );
}
