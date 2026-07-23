export default function CinemaSettingsLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        role="status"
        aria-live="polite"
      >
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
        <span className="font-medium">Indlæser biografindstillinger...</span>
      </div>
    </main>
  );
}
