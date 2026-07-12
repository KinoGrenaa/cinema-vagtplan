import Link from "next/link";

type SystemErrorLogsHeaderProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

export default function SystemErrorLogsHeader({
  refreshing,
  onRefresh,
}: SystemErrorLogsHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
            MASTER-værktøj
          </p>
          <h1 className="mt-1 text-3xl font-bold">Systemfejllog</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Se backend-fejl på tværs af systemet, filtrer efter status, niveau og
            biograf, og markér fejl som set, løst eller ignoreret.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/master"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Tilbage til MASTER
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            {refreshing ? "Opdaterer..." : "Opdater liste"}
          </button>
        </div>
      </div>
    </section>
  );
}
