export default function WorkTypesHeader() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
        Vagtplan
      </div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Vagttyper</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        Administrer vagttyper, farver og koblingen til lønarter.
      </p>
    </section>
  );
}
