import {
  formatDateTime,
  getShortBody,
  getUserName,
  type InboxMessage,
} from "../../helpers/core/inboxMessageHelpers";

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
          <article
            key={message.id}
            className={`overflow-hidden rounded-2xl border shadow-sm transition-colors ${
              message.isRead
                ? "border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-900"
                : "border-blue-300 bg-blue-50 dark:border-blue-700/80 dark:bg-blue-950/30"
            }`}
          >
            <button
              type="button"
              onClick={() => onOpenMessage(message.id, isExpanded)}
              aria-expanded={isExpanded}
              className="w-full rounded-t-2xl p-5 text-left transition-colors hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:hover:bg-slate-800/80 dark:focus-visible:ring-blue-400"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {!message.isRead && (
                      <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white dark:bg-red-500">
                        Ulæst
                      </span>
                    )}

                    {message.isBroadcast && (
                      <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white dark:bg-blue-500">
                        Sendt til alle
                      </span>
                    )}
                  </div>

                  <h2
                    className={`truncate text-lg ${
                      message.isRead
                        ? "font-semibold text-slate-800 dark:text-slate-100"
                        : "font-bold text-slate-950 dark:text-white"
                    }`}
                  >
                    {message.subject}
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Fra: {getUserName(message.sender) || "System"}
                  </p>

                  {!isExpanded && (
                    <p className="mt-2 line-clamp-1 text-sm text-slate-700 dark:text-slate-300">
                      {getShortBody(message.body)}
                    </p>
                  )}
                </div>

                <time className="shrink-0 text-sm text-slate-500 dark:text-slate-400 md:text-right">
                  {formatDateTime(message.createdAt)}
                </time>
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-4 border-t border-slate-200 bg-white p-5 dark:border-slate-700/80 dark:bg-slate-900">
                <div className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <div>Fra: {getUserName(message.sender) || "System"}</div>
                  <div>
                    Til:{" "}
                    {message.isBroadcast
                      ? "Alle"
                      : getUserName(message.receiver) || "Dig"}
                  </div>
                  <div>Sendt: {formatDateTime(message.createdAt)}</div>
                </div>

                <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  {message.body || "Ingen beskedtekst."}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => onArchive(message.id)}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 active:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 dark:active:bg-amber-300 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-slate-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                  >
                    Arkiver
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
