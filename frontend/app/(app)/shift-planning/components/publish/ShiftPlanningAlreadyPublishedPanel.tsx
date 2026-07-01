export function ShiftPlanningAlreadyPublishedPanel() {
  return (
    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
      <p className="font-semibold">Denne kladde er allerede publiceret.</p>
      <p className="mt-1 opacity-85">
        Den kan ikke publiceres igen. Åbn vagtplanen for at gennemgå de
        oprettede vagter.
      </p>
      <a
        href="/schedule"
        className="mt-3 inline-flex rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-200 dark:text-green-950 dark:hover:bg-green-100"
      >
        Åbn vagtplan
      </a>
    </div>
  );
}
