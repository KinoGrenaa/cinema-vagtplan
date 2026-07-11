export default function WorkTypesMasterCinemaRequired() {
  return (
    <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
      <div className="text-sm font-medium uppercase tracking-wide">
        Biograf mangler
      </div>

      <p className="mt-2 text-sm">
        Vælg først en biograf i MASTER-panelet, før du administrerer vagttyper
        og lønarter.
      </p>

      <a
        href="/master"
        className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
      >
        Gå til MASTER-panel
      </a>
    </section>
  );
}
