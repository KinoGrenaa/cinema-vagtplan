export default function AuditLogMasterCinemaRequired() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-700/70 dark:bg-amber-950/35 dark:shadow-none sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-lg text-amber-950 dark:bg-amber-900 dark:text-amber-100"
        >
          !
        </span>
        <div>
          <h1 className="text-xl font-bold text-amber-950 dark:text-amber-100">
            Ingen aktiv biograf valgt
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-amber-900 dark:text-amber-100/85">
            Vælg en biograf i MASTER-panelet, før du kan se ændringshistorik.
          </p>
        </div>
      </div>
    </section>
  );
}
