export default function StaffingRequestsHeader() {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="p-6 md:p-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Ekstra bemanding
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
          Bemandingsforespørgsler
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
          Få overblik over akutte forespørgsler, ekstra vagter og afsluttede
          bemandingsbehov for den aktive biograf.
        </p>
      </div>
    </section>
  );
}
