export default function DayPeriodsHeader() {
  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Vagtplanlægning
      </p>
      <h1 className="mt-1 text-3xl font-bold">Dagsperioder</h1>
      <p className="mx-auto mt-2 max-w-4xl text-sm text-gray-600 dark:text-gray-300">
        Dagsperioder er hårde beregningsrammer for kommende jobfunktioner. De er
        ikke lønarter og ændrer ikke vagtplanen endnu.
      </p>
    </header>
  );
}
