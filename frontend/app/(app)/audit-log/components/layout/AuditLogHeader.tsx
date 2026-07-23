export default function AuditLogHeader() {
  return (
    <header className="mb-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
        Administration
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
        Ændringshistorik
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
        Overblik over administrative handlinger og vigtige ændringer i systemet.
      </p>
    </header>
  );
}
