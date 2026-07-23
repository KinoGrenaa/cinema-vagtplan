type MasterCreateCinemaSectionProps = {
  newCinemaName: string;
  creating: boolean;
  onNewCinemaNameChange: (value: string) => void;
  onCreateCinema: () => void;
};

export default function MasterCreateCinemaSection({
  newCinemaName,
  creating,
  onNewCinemaNameChange,
  onCreateCinema,
}: MasterCreateCinemaSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">Opret biograf</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Opretter en ny biograf med standardindstillinger. Admins og
        medarbejdere kan tilknyttes senere.
      </p>
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          value={newCinemaName}
          onChange={(event) => onNewCinemaNameChange(event.target.value)}
          placeholder="Biografnavn"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
        />
        <button
          type="button"
          onClick={onCreateCinema}
          disabled={creating}
          className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
        >
          {creating ? "Opretter..." : "Opret biograf"}
        </button>
      </div>
    </div>
  );
}
