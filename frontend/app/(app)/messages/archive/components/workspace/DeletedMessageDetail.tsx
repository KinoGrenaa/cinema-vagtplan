import { getConversationDisplaySubject } from "@/app/utils/messageSubject";

import {
  formatDateTime,
  getArchivedDateLabel,
  getUserName,
} from "../../helpers/core/archiveMessageHelpers";
import type {
  ArchiveSection,
  Message,
} from "../../helpers/core/archiveMessageTypes";

type DeletedMessageDetailProps = {
  message: Message | null;
  activeSection:
    ArchiveSection;
  restoring:
    boolean;
  onRestore:
    (
      message: Message,
      section:
        ArchiveSection,
    ) => void;
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
          value,
        ): value is string =>
          Boolean(value),
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
    "Ukendt"
  );
}

export default function DeletedMessageDetail({
  message,
  activeSection,
  restoring,
  onRestore,
}: DeletedMessageDetailProps) {
  if (!message) {
    return (
      <section className="flex min-h-[28rem] items-center justify-center bg-white p-8 text-center dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Vælg noget fra Slettet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Vælg en samtale eller besked i listen for at se indholdet eller flytte den tilbage.
          </p>
        </div>
      </section>
    );
  }

  const conversationMessages =
    activeSection ===
      "received"
      ? message
          .conversationMessages ??
        []
      : [];
  const title =
    activeSection ===
    "received"
      ? getConversationDisplaySubject(
          message.subject,
        )
      : message.subject;

  return (
    <section className="flex min-h-[34rem] flex-col bg-white dark:bg-slate-900 lg:min-h-[calc(100dvh-12rem)]">
      <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-700/80">
        <h1 className="text-lg font-bold text-slate-950 dark:text-white">
          {title}
        </h1>
        <div className="mt-2 grid gap-1 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Slettet:{" "}
            {getArchivedDateLabel(
              message,
            )}
          </div>
          {activeSection ===
            "received" &&
            message
              .conversationMessageCount && (
              <div>
                {
                  message
                    .conversationMessageCount
                }{" "}
                {message
                  .conversationMessageCount ===
                1
                  ? "besked"
                  : "beskeder"}{" "}
                i samtalen
              </div>
            )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {conversationMessages.length >
        0 ? (
          <div className="space-y-3">
            {conversationMessages.map(
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
        ) : (
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="grid gap-1 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Fra:{" "}
                {getUserName(
                  message.sender,
                ) ||
                  "System"}
              </div>
              <div>
                Til:{" "}
                {getRecipientLabel(
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

            <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
              {message.body ||
                "Ingen beskedtekst."}
            </div>
          </article>
        )}
      </div>

      <footer className="flex justify-end border-t border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-950/50">
        <button
          type="button"
          onClick={() =>
            onRestore(
              message,
              activeSection,
            )
          }
          disabled={
            restoring
          }
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
        >
          {restoring
            ? "Flytter tilbage..."
            : activeSection ===
                "received"
              ? "Flyt samtalen tilbage"
              : "Flyt beskeden tilbage"}
        </button>
      </footer>
    </section>
  );
}
