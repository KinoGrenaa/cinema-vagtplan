export default function SettingsHeader() {
  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-3xl font-bold">Brugerindstillinger</h1>

      <p className="mt-2 max-w-2xl text-gray-600 dark:text-slate-300">
        Administrer standardbiograf, biograftilknytninger, tema og
        push-notifikationer.
      </p>
    </header>
  );
}
