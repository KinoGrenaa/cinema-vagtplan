import type {
  Message,
  MessageConversation,
} from "@/app/types/messages";
import { getConversationDisplaySubject } from "@/app/utils/messageSubject";

import {
  formatDateTime,
  getUserName,
  type InboxMessage,
} from "../../helpers/core/inboxMessageHelpers";

type InboxConversationDetailProps = {
  message:
    | InboxMessage
    | null;
  conversation:
    | MessageConversation
    | null;
  loading: boolean;
  canSendBroadcastMessages: boolean;
  onReply:
    (
      messageId: number,
      mode:
        | "REPLY"
        | "REPLY_ALL",
    ) => void;
  onDelete:
    (messageId: number) => void;
};

function getRecipientLabel(
  message: Message,
) {
  if (message.isBroadcast) {
    return "Alle";
  }

  const recipients =
    (
      message.recipientParticipants ??
      []
    )
      .map((recipient) =>
        getUserName(
          recipient,
        ),
      )
      .filter(
        (
          name,
        ): name is string =>
          Boolean(name),
      );

  if (recipients.length > 0) {
    return recipients.join(
      ", ",
    );
  }

  return (
    getUserName(
      message.receiver,
    ) ||
    "Dig"
  );
}

export default function InboxConversationDetail({
  message,
  conversation,
  loading,
  canSendBroadcastMessages,
  onReply,
  onDelete,
}: InboxConversationDetailProps) {
  if (!message) {
    return (
      <section className="flex min-h-[28rem] items-center justify-center bg-white p-8 text-center dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Vælg en samtale
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Vælg en samtale i listen for at læse den og svare.
          </p>
        </div>
      </section>
    );
  }

  const canReply =
    conversation
      ? conversation.reply
          .canReply
      : !loading;

  const canReplyAll =
    conversation
      ? conversation.reply
          .canReplyAll
      : !loading &&
        (message.isBroadcast ||
          !message.receiver) &&
        (!message.isBroadcast ||
          canSendBroadcastMessages);

  const messages =
    conversation
      ?.messages ??
    [];

  const messageCount =
    message
      .conversationMessageCount ??
    (messages.length || 1);

  return (
    <section className="flex min-h-[34rem] flex-col bg-white dark:bg-slate-900 lg:min-h-[calc(100dvh-12rem)]">
      <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-700/80">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">
          {getConversationDisplaySubject(
            message.subject,
          )}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {messageCount}{" "}
            {messageCount === 1
              ? "besked"
              : "beskeder"}
          </span>
          <span>
            Seneste aktivitet:{" "}
            {formatDateTime(
              message
                .conversationLastActivityAt ??
                message.createdAt,
            )}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading &&
          !conversation && (
            <div
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              role="status"
            >
              Henter samtalen...
            </div>
          )}

        {conversation && (
          <div className="space-y-3">
            {messages.map(
              (
                conversationMessage,
              ) => (
                <article
                  key={
                    conversationMessage.id
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                >
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {getUserName(
                        conversationMessage.sender,
                      ) ||
                        "System"}
                    </span>
                    <time className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(
                        conversationMessage.createdAt,
                      )}
                    </time>
                  </div>

                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Til:{" "}
                    {getRecipientLabel(
                      conversationMessage,
                    )}
                  </div>

                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                    {conversationMessage.body ||
                      "Ingen beskedtekst."}
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {!conversation &&
          !loading && (
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {getUserName(
                  message.sender,
                ) ||
                  "System"}
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                {message.body ||
                  "Ingen beskedtekst."}
              </div>
            </article>
          )}
      </div>

      <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-950/50">
        {canReply && (
          <button
            type="button"
            onClick={() =>
              onReply(
                message.id,
                "REPLY",
              )
            }
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
          >
            Svar
          </button>
        )}

        {canReplyAll && (
          <button
            type="button"
            onClick={() =>
              onReply(
                message.id,
                "REPLY_ALL",
              )
            }
            className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
          >
            Svar alle
          </button>
        )}

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
