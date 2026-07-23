export default function DayPeriodsHeader() {
  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        Vagtplanlægning
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
        Dagsperioder
      </h1>
      <p className="mx-auto mt-3 max-w-4xl text-sm leading-6 text-gray-600 dark:text-gray-300">
        Opret og administrér faste tidsintervaller med navn, starttid, sluttid og
        sortering.
      </p>
    </header>
  );
}
