export default function DayPeriodsMasterCinemaRequired() {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
        Biograf mangler
      </div>
      <p className="mt-2 text-sm leading-6">
        Vælg først en biograf i MASTER-panelet, før du administrerer
        dagsperioder.
      </p>
      <a
        href="/master"
        className="mt-4 inline-flex rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-800 active:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-amber-500 dark:text-gray-950 dark:hover:bg-amber-400 dark:active:bg-amber-300 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-gray-950"
      >
        Gå til MASTER-panel
      </a>
    </section>
  );
}
