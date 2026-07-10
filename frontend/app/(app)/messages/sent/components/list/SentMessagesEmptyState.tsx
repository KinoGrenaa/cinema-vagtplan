export default function SentMessagesEmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Ingen sendte beskeder
      </h2>

      <p className="mt-2">Du har ikke sendt nogen beskeder endnu.</p>
    </div>
  );
}
