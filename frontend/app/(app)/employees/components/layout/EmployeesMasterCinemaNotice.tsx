export default function EmployeesMasterCinemaNotice() {
  return (
    <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
      <h2 className="text-lg font-semibold">Ingen aktiv biograf valgt</h2>

      <p className="mt-2 text-sm">
        Vælg en biograf i MASTER-panelet, før du kan se eller ændre
        medarbejderrettigheder.
      </p>
    </div>
  );
}
