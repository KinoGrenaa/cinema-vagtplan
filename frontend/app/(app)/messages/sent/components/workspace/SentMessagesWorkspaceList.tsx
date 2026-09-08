import type {
  Message,
} from "@/app/types/messages";

import {
  formatDateTime,
  getReadReceiptBadgeClass,
  getReadReceiptSummary,
  getSentRecipientLabel,
  getShortBody,
} from "../../helpers/core/sentMessageHelpers";

type SentMessagesWorkspaceListProps = {
  messages: Message[];
  selectedMessageId:
    number | null;
  onSelect:
    (messageId: number) => void;
};

export default function SentMessagesWorkspaceList({
  messages,
  selectedMessageId,
  onSelect,
}: SentMessagesWorkspaceListProps) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700/80">
      {messages.map(
        (message) => {
          const selected =
            selectedMessageId ===
            message.id;
          const receiptSummary =
            getReadReceiptSummary(
              message,
            );

          return (
            <button
              key={message.id}
              type="button"
              onClick={() =>
                onSelect(
                  message.id,
                )
              }
              aria-pressed={
                selected
              }
              className={`block w-full px-4 py-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 ${
                selected
                  ? "bg-blue-50 dark:bg-blue-950/35"
                  : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-slate-950 dark:text-white">
                    {message.subject}
                  </h2>

                  <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
                    Til:{" "}
                    {getSentRecipientLabel(
                      message,
                    )}
                  </p>
                </div>

                <time className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                  {formatDateTime(
                    message.createdAt,
                  )}
                </time>
              </div>

              <p className="mt-2 line-clamp-1 text-sm text-slate-700 dark:text-slate-300">
                {getShortBody(
                  message.body,
                )}
              </p>

              {receiptSummary && (
                <span
                  className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getReadReceiptBadgeClass(
                    message,
                  )}`}
                >
                  {receiptSummary}
                </span>
              )}
            </button>
          );
        },
      )}
    </div>
  );
}
