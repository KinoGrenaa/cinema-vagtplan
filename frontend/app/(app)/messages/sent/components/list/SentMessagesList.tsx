import {
  formatDateTime,
  getShortBody,
  getUserName,
  type MessageDateGroup,
} from "../../helpers/core/sentMessageHelpers";

import type { Message } from "../../../../../types/messages";

type SentMessagesListProps = {
  sortedMessages: Message[];
  groupedMessages: MessageDateGroup[];
  expandedDateKeys: string[];
  expandedMessageId: number | null;
  onToggleDateGroup: (dateKey: string) => void;
  onToggleMessage: (messageId: number) => void;
  onArchive: (messageId: number) => void;
};

export default function SentMessagesList({
  sortedMessages,
  groupedMessages,
  expandedDateKeys,
  expandedMessageId,
  onToggleDateGroup,
  onToggleMessage,
  onArchive,
}: SentMessagesListProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Viser {sortedMessages.length} sendte beskeder grupperet efter sendtdato.
      </div>

      {groupedMessages.map((group) => {
        const isGroupExpanded = expandedDateKeys.includes(group.dateKey);

        return (
          <section
            key={group.dateKey}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
          >
            <button
              type="button"
              onClick={() => onToggleDateGroup(group.dateKey)}
              aria-expanded={isGroupExpanded}
              className="flex w-full flex-col gap-2 border-b border-gray-200 px-5 py-4 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/70 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {group.dateLabel}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {group.messages.length} beskeder sendt denne dato
                </div>
              </div>
              <span className="w-fit rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-950">
                {isGroupExpanded ? "Skjul" : "Vis"}
              </span>
            </button>

            {isGroupExpanded && (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {group.messages.map((message) => {
                  const isExpanded = expandedMessageId === message.id;

                  return (
                    <article key={message.id}>
                      <button
                        type="button"
                        onClick={() => onToggleMessage(message.id)}
                        className="w-full p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap gap-2">
                              {message.isBroadcast && (
                                <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                                  Sendt til alle
                                </span>
                              )}
                            </div>

                            <h2 className="truncate text-lg font-bold text-black dark:text-white">
                              {message.subject}
                            </h2>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Til:{" "}
                              {message.isBroadcast
                                ? "Alle"
                                : getUserName(message.receiver) || "Ukendt"}
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
                            <div>
                              Fra: {getUserName(message.sender) || "Dig"}
                            </div>
                            <div>
                              Til:{" "}
                              {message.isBroadcast
                                ? "Alle"
                                : getUserName(message.receiver) || "Ukendt"}
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
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
