import {
  formatDateTime,
  getShortBody,
  getUserName,
  type InboxMessage,
} from "../../helpers/inboxMessageHelpers";

type InboxMessagesListProps = {
  messages: InboxMessage[];
  expandedMessageId: number | null;
  onOpenMessage: (messageId: number, isExpanded: boolean) => void;
  onArchive: (messageId: number) => void;
};

export default function InboxMessagesList({
  messages,
  expandedMessageId,
  onOpenMessage,
  onArchive,
}: InboxMessagesListProps) {
  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isExpanded = expandedMessageId === message.id;

        return (
          <div
            key={message.id}
            className={`overflow-hidden rounded-2xl border shadow-sm transition-colors ${
              message.isRead
                ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onOpenMessage(message.id, isExpanded)}
              className="w-full p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {!message.isRead && (
                      <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                        Ulæst
                      </span>
                    )}

                    {message.isBroadcast && (
                      <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                        Sendt til alle
                      </span>
                    )}
                  </div>

                  <h2
                    className={`truncate text-lg ${
                      message.isRead
                        ? "font-medium text-gray-700 dark:text-gray-200"
                        : "font-bold text-black dark:text-white"
                    }`}
                  >
                    {message.subject}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Fra: {getUserName(message.sender) || "System"}
                  </p>

                  {!isExpanded && (
                    <p className="mt-2 line-clamp-1 text-sm text-gray-600 dark:text-gray-300">
                      {getShortBody(message.body)}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-sm text-gray-400 dark:text-gray-500 md:text-right">
                  {formatDateTime(message.createdAt)}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-4 border-t border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="grid gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <div>Fra: {getUserName(message.sender) || "System"}</div>
                  <div>
                    Til:{" "}
                    {message.isBroadcast
                      ? "Alle"
                      : getUserName(message.receiver) || "Dig"}
                  </div>
                  <div>Sendt: {formatDateTime(message.createdAt)}</div>
                </div>

                <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                  {message.body || "Ingen beskedtekst."}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => onArchive(message.id)}
                    className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-200 dark:text-black dark:hover:bg-white"
                  >
                    Arkiver
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
