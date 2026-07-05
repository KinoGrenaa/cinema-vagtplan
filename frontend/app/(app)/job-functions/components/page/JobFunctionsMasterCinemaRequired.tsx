export default function JobFunctionsMasterCinemaRequired() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
        Biograf mangler
      </p>
      <h2 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
        Vælg en aktiv biograf
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-700 dark:text-gray-300">
        Jobfunktioner er biograf-specifikke. Vælg først en biograf i
        MASTER-panelet, før du administrerer jobfunktioner.
      </p>
      <a
        href="/master"
        className="mt-5 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-gray-950 dark:hover:bg-amber-400"
      >
        Gå til MASTER-panel
      </a>
    </div>
  );
}
