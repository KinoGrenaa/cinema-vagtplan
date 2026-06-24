export default function AuditLogMasterCinemaRequired() {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
      <h1 className="text-xl font-bold text-amber-950 dark:text-amber-100">
        Ingen aktiv biograf valgt
      </h1>
      <p className="mt-1 text-sm text-amber-900 dark:text-amber-100/80">
        Vælg en biograf i MASTER-panelet, før du kan se ændringshistorik.
      </p>
    </section>
  );
}
