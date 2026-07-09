export default function ScheduleTemplatesMasterCinemaRequired() {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="text-xs font-black uppercase tracking-[0.2em]">
        Ingen aktiv biograf valgt
      </p>
      <h2 className="mt-2 text-2xl font-black">
        Vælg biograf før vagtsskabeloner
      </h2>
      <p className="mt-2 max-w-3xl text-sm">
        MASTER skal vælge en aktiv biograf, før vagtsskabeloner kan oprettes
        eller redigeres. Skabelonerne knyttes til den valgte biograf og bruges i
        vagtplanlægningen.
      </p>
      <a
        href="/master"
        className="mt-4 inline-flex rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold text-white hover:bg-amber-700"
      >
        Vælg biograf
      </a>
    </section>
  );
}
