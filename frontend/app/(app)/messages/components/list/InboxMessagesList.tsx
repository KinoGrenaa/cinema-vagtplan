import {
  formatDateTime,
  getShortBody,
  getUserName,
  type InboxMessage,
} from "../../helpers/core/inboxMessageHelpers";
import { getConversationDisplaySubject } from "@/app/utils/messageSubject";

type InboxMessagesListProps = {
  messages: InboxMessage[];
  selectedConversationId:
    string | null;
  focusedConversationId:
    string | null;
  onOpenMessage:
    (messageId: number) => void;
};

function getConversationId(
  message: InboxMessage,
) {
  return (
    message.conversationId ??
    `message-${message.id}`
  );
}

export default function InboxMessagesList({
  messages,
  selectedConversationId,
  focusedConversationId,
  onOpenMessage,
}: InboxMessagesListProps) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700/80">
      {messages.map(
        (message) => {
          const conversationId =
            getConversationId(
              message,
            );
          const selected =
            selectedConversationId ===
            conversationId;
          const focused =
            focusedConversationId ===
            conversationId;
          const unreadCount =
            message
              .conversationUnreadCount ??
            (message.isRead
              ? 0
              : 1);
          const messageCount =
            message
              .conversationMessageCount ??
            1;

          return (
            <button
              key={conversationId}
              id={`inbox-conversation-${conversationId}`}
              type="button"
              onClick={() =>
                onOpenMessage(
                  message.id,
                )
              }
              aria-pressed={
                selected
              }
              className={`block w-full px-4 py-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 ${
                selected
                  ? "bg-blue-50 dark:bg-blue-950/35"
                  : unreadCount > 0
                    ? "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                    : "bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/70"
              } ${
                focused
                  ? "ring-2 ring-inset ring-blue-500 dark:ring-blue-400"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {unreadCount >
                      0 && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 dark:bg-red-500"
                        aria-label="Ulæst"
                      />
                    )}
                    <h2
                      className={`truncate text-sm ${
                        unreadCount >
                        0
                          ? "font-bold text-slate-950 dark:text-white"
                          : "font-semibold text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {getConversationDisplaySubject(
                        message.subject,
                      )}
                    </h2>
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
                    Seneste fra:{" "}
                    {getUserName(
                      message.sender,
                    ) ||
                      "System"}
                  </p>
                </div>

                <time className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                  {formatDateTime(
                    message
                      .conversationLastActivityAt ??
                      message.createdAt,
                  )}
                </time>
              </div>

              <p className="mt-2 line-clamp-1 text-sm text-slate-700 dark:text-slate-300">
                {getShortBody(
                  message.body,
                )}
              </p>

              {messageCount >
                1 && (
                <span className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {messageCount}{" "}
                  beskeder
                </span>
              )}
            </button>
          );
        },
      )}
    </div>
  );
}
