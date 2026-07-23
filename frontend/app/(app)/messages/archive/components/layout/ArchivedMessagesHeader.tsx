export default function ArchivedMessagesHeader() {
  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
        Arkiverede beskeder
      </h1>
      <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-400">
        Skift mellem modtagne og sendte arkiverede beskeder. Beskederne er
        grupperet efter sendtdato.
      </p>
    </header>
  );
}
