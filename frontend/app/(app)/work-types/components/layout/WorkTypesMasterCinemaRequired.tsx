export default function WorkTypesMasterCinemaRequired() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm transition-colors dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
      <div className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Biograf mangler
      </div>
      <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
        Vælg først en biograf i MASTER-panelet, før du administrerer vagttyper
        og lønarter.
      </p>
      <a
        href="/master"
        className="mt-4 inline-flex rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-amber-950"
      >
        Gå til MASTER-panel
      </a>
    </section>
  );
}
