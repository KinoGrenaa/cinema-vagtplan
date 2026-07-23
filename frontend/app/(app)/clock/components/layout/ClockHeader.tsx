export default function ClockHeader() {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
        Tidsregistrering
      </p>
      <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
        Clock ind / ud
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Registrer arbejdstid og se tidligere registreringer.
      </p>
    </header>
  );
}
