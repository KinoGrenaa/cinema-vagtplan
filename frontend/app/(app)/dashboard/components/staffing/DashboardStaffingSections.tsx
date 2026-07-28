type DashboardStaffingSectionsProps = {
  staffingWarnings: string[];
  predictiveStaffing: string[];
  movieDataAvailable: boolean;
};

export default function DashboardStaffingSections({
  staffingWarnings,
  predictiveStaffing,
  movieDataAvailable,
}: DashboardStaffingSectionsProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm dark:border-orange-900 dark:bg-orange-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl" aria-hidden="true">⚠️</div>
          <div>
            <h2 className="text-xl font-bold text-orange-700 dark:text-orange-300">
              Bemandingsadvarsler
            </h2>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              Forhold i dagens plan, som kan kræve opmærksomhed.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {(staffingWarnings.length > 0
            ? staffingWarnings
            : ["Der er ingen aktuelle bemandingsadvarsler."]
          ).map((warning, index) => (
            <div
              key={index}
              className="rounded-xl border border-orange-200 bg-white p-4 text-sm text-orange-700 dark:border-orange-900 dark:bg-gray-900 dark:text-orange-300"
            >
              {warning}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm dark:border-purple-900 dark:bg-purple-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl" aria-hidden="true">🔭</div>
          <div>
            <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300">
              Forventet bemandingsbehov
            </h2>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              Automatisk vurdering af mulige udfordringer senere på dagen.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {(predictiveStaffing.length > 0
            ? predictiveStaffing
            : [
                movieDataAvailable
                  ? "Der er ingen forventede bemandingsproblemer lige nu."
                  : "Filmprogrammet er tomt eller ikke tilgængeligt. Filmrelaterede forudsigelser kan ikke beregnes.",
              ]
          ).map((prediction, index) => (
            <div
              key={index}
              className="rounded-xl border border-purple-200 bg-white p-4 text-sm text-purple-700 dark:border-purple-900 dark:bg-gray-900 dark:text-purple-300"
            >
              {prediction}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
