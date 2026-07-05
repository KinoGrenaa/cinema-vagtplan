export default function JobFunctionsPageHeader() {
  return (
    <header className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        Vagtplanlægning
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
        Jobfunktioner
      </h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Jobfunktioner beskriver bemandingsroller og kompetencer.
        Vagtplanlægning bruger dem til at oprette vagter med korrekt løntype
        via feltet Oprettes som.
      </p>
    </header>
  );
}
