import type {
  MessageConversation,
  MessageParticipant,
} from "@/app/types/messages";
import {
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

function getName(participant?: MessageParticipant | null) {
  if (!participant) return "Ukendt";
  return `${participant.firstName} ${participant.lastName}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

export default function MessageConversationContext({
  conversation,
}: {
  conversation: MessageConversation;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h2 className="text-lg font-bold text-gray-950 dark:text-white">
          Samtale
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Den oprindelige besked og tidligere svar vises her.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {conversation.messages.map((message) => {
          const recipients = message.isBroadcast
            ? "Alle"
            : message.recipientParticipants?.map(getName).join(", ") ||
              getName(message.receiver);

          return (
            <article
              key={message.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {getName(message.sender)}
                  </span>
                  <span> → {recipients}</span>
                </div>
                <time>{formatDateTime(message.createdAt)}</time>
              </div>

              <div className="mt-2 font-semibold text-gray-950 dark:text-white">
                {message.subject}
              </div>

              <div className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {message.body}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
