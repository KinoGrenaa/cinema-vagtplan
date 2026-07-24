import Link from "next/link";

type SystemErrorLogsHeaderProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

const secondaryButtonClass =
  "rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900";

export default function SystemErrorLogsHeader({
  refreshing,
  onRefresh,
}: SystemErrorLogsHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
            MASTER-værktøj
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
            Systemfejllog
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Se backend-fejl på tværs af systemet, filtrer efter status, niveau
            og biograf, og markér fejl som set, løst eller ignoreret.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/master" className={secondaryButtonClass}>
            Tilbage til MASTER
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
          >
            {refreshing ? "Opdaterer..." : "Opdater liste"}
          </button>
        </div>
      </div>
    </section>
  );
}
