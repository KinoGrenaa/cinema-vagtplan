import type {
  Message,
  MessageParticipant,
} from "@/app/types/messages";

import {
  formatDateTime,
  getReadReceiptBadgeClass,
  getReadReceiptSummary,
  getSentRecipientLabel,
  getUserName,
} from "../../helpers/core/sentMessageHelpers";

type SentMessageDetailProps = {
  message: Message | null;
  onDelete:
    (messageId: number) => void;
};

function formatParticipantNames(
  participants:
    | MessageParticipant[]
    | undefined,
) {
  if (!participants?.length) {
    return null;
  }

  return participants
    .map((participant) =>
      getUserName(
        participant,
      ),
    )
    .filter(Boolean)
    .join(", ");
}

export default function SentMessageDetail({
  message,
  onDelete,
}: SentMessageDetailProps) {
  if (!message) {
    return (
      <section className="flex min-h-[28rem] items-center justify-center bg-white p-8 text-center dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Vælg en sendt besked
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Vælg en besked i listen for at læse den og se læsestatus.
          </p>
        </div>
      </section>
    );
  }

  const receiptSummary =
    getReadReceiptSummary(
      message,
    );
  const readBy =
    formatParticipantNames(
      message.readReceipt
        ?.readBy,
    );
  const unreadBy =
    formatParticipantNames(
      message.readReceipt
        ?.unreadBy,
    );

  return (
    <section className="flex min-h-[34rem] flex-col bg-white dark:bg-slate-900 lg:min-h-[calc(100dvh-12rem)]">
      <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-700/80">
        <h1 className="text-lg font-bold text-slate-950 dark:text-white">
          {message.subject}
        </h1>
        <div className="mt-2 grid gap-1 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Fra:{" "}
            {getUserName(
              message.sender,
            ) ||
              "Dig"}
          </div>
          <div>
            Til:{" "}
            {getSentRecipientLabel(
              message,
            )}
          </div>
          <div>
            Sendt:{" "}
            {formatDateTime(
              message.createdAt,
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {receiptSummary && (
          <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Læsestatus
              </h2>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getReadReceiptBadgeClass(
                  message,
                )}`}
              >
                {receiptSummary}
              </span>
            </div>

            {(!message.receiver ||
              message.isBroadcast) &&
              readBy && (
                <p className="mt-3 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">
                    Læst af:
                  </span>{" "}
                  {readBy}
                </p>
              )}

            {(!message.receiver ||
              message.isBroadcast) &&
              unreadBy && (
                <p className="mt-1 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">
                    Ikke læst af:
                  </span>{" "}
                  {unreadBy}
                </p>
              )}
          </section>
        )}

        <article className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {message.body ||
            "Ingen beskedtekst."}
        </article>
      </div>

      <footer className="flex justify-end border-t border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-950/50">
        <button
          type="button"
          onClick={() =>
            onDelete(
              message.id,
            )
          }
          className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:text-white dark:hover:bg-red-500 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-slate-900"
        >
          Slet
        </button>
      </footer>
    </section>
  );
}
