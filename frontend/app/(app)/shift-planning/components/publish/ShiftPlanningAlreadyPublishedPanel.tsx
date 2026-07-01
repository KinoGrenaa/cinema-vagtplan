export function ShiftPlanningAlreadyPublishedPanel() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-semibold">Planlægningskladde er allerede publiceret</p>
      <p className="mt-1">
        Denne kladde er låst for ny publicering, så der ikke oprettes
        dubletvagter. Åbn vagtplanen for at gennemgå de vagter, der allerede er
        oprettet.
      </p>
      <a
        href="/schedule"
        className="mt-3 inline-flex rounded-xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
      >
        Åbn vagtplan
      </a>
    </div>
  );
}
