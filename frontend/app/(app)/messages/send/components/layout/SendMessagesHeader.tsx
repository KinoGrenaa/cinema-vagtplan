export default function SendMessagesHeader({
  replying = false,
}: {
  replying?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-3xl font-bold">
        {replying ? "Svar på besked" : "Send besked"}
      </h1>

      <p className="mt-2 text-gray-500 dark:text-gray-400">
        {replying
          ? "Skriv dit svar. Den tidligere samtale vises nedenfor."
          : "Send en besked til en eller flere personer eller til hele biografen."}
      </p>
    </div>
  );
}
