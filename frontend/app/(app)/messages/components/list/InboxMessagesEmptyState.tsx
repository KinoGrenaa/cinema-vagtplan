export default function InboxMessagesEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <h2 className="text-xl font-bold text-slate-950 dark:text-white">
        Ingen beskeder
      </h2>
      <p className="mt-2">Din indbakke er tom lige nu.</p>
    </section>
  );
}
