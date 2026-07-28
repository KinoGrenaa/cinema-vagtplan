export default function DashboardHeader() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Aktiv biograf
      </p>
      <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
        Driftsoverblik
      </h1>
      <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">
        Status, bemanding og aktivitet for den valgte biograf.
      </p>
    </section>
  );
}
