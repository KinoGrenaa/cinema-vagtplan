import {
  formatDateTime,
  getUserName,
} from "../../helpers/core/archiveMessageHelpers";
import type {
  Message,
} from "../../helpers/core/archiveMessageTypes";

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

export default function ArchivedConversationThread({
  message,
}: {
  message: Message;
}) {
  const conversationMessages =
    message.conversationMessages ??
    [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-950 dark:text-white">
          Samtale
        </h3>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {conversationMessages.length}{" "}
          {conversationMessages.length ===
          1
            ? "besked"
            : "beskeder"}
        </span>
      </div>

      <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
        {conversationMessages.map(
          (
            conversationMessage,
          ) => (
            <div
              key={
                conversationMessage.id
              }
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {getUserName(
                    conversationMessage.sender,
                  ) ||
                    "System"}
                </span>

                <time className="shrink-0 text-gray-500 dark:text-gray-400">
                  {formatDateTime(
                    conversationMessage.createdAt,
                  )}
                </time>
              </div>

              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Til:{" "}
                {getRecipientLabel(
                  conversationMessage,
                )}
              </div>

              <div className="mt-3 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {conversationMessage.body ||
                  "Ingen beskedtekst."}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
