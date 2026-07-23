export default function InboxMessagesHeader() {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700/80 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-400">
        Beskeder
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
        Indbakke
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Her kan du se beskeder, der er sendt til dig.
      </p>
    </header>
  );
}
