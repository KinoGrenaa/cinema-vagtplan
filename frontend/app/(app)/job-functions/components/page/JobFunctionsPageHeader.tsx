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
        En jobfunktion er definitionen af en vagt. Her samles navn, farve,
        medarbejderadgang, filmvalg, tidsregel og eventuel eksportkode.
      </p>
    </header>
  );
}
