type MasterHeaderProps = {
  onRefresh: () => void;
};

export default function MasterHeader({ onRefresh }: MasterHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
            Global administration
          </p>
          <h1 className="mt-1 text-3xl font-bold">MASTER-panel</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Administrer biografer på tværs af systemet. MASTER-brugeren er
            stadig global og bliver ikke bundet til en fast biograf.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          Opdater liste
        </button>
      </div>
    </div>
  );
}
