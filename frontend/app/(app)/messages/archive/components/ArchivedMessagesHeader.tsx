export default function ArchivedMessagesHeader() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-3xl font-bold">Arkiverede beskeder</h1>

      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Skift mellem modtagne og sendte arkiverede beskeder. Beskederne er
        grupperet efter sendtdato.
      </p>
    </div>
  );
}
