export default function ShiftPlanningMasterCinemaRequired() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Ingen aktiv biograf valgt
      </p>
      <h2 className="mt-2 text-2xl font-bold">Vælg en aktiv biograf</h2>
      <p className="mt-2 max-w-2xl text-sm text-amber-900/80 dark:text-amber-100/80">
        Vagtplanlægning er biograf-specifik. Vælg først en biograf i
        MASTER-panelet, før du lægger vagtsskabeloner på konkrete datoer.
      </p>
      <a
        href="/master"
        className="mt-5 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-gray-950 dark:hover:bg-amber-400"
      >
        Vælg biograf i MASTER-panel
      </a>
    </section>
  );
}
