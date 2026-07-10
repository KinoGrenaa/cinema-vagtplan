import {
  formatDateTime,
  getArchivedDateLabel,
  getRestoreTargetLabel,
  getShortBody,
  getUserName,
} from "../../helpers/archiveMessageHelpers";

import type {
  ArchiveSection,
  Message,
  MessageDateGroup,
} from "../../helpers/archiveMessageTypes";

type ArchivedMessagesListSectionProps = {
  pageLoading: boolean;
  messageCount: number;
  activeSection: ArchiveSection;
  receivedCount: number;
  sentCount: number;
  activeCount: number;
  activeSectionLabel: string;
  emptyText: string;
  groupedMessages: MessageDateGroup[];
  expandedDateKeys: string[];
  expandedMessageId: number | null;
  restoringMessageId: number | null;
  onSwitchSection: (section: ArchiveSection) => void;
  onToggleDateGroup: (dateKey: string) => void;
  onToggleMessage: (messageId: number) => void;
  onConfirmRestoreMessage: (message: Message, section: ArchiveSection) => void;
};

export default function ArchivedMessagesListSection({
  pageLoading,
  messageCount,
  activeSection,
  receivedCount,
  sentCount,
  activeCount,
  activeSectionLabel,
  emptyText,
  groupedMessages,
  expandedDateKeys,
  expandedMessageId,
  restoringMessageId,
  onSwitchSection,
  onToggleDateGroup,
  onToggleMessage,
  onConfirmRestoreMessage,
}: ArchivedMessagesListSectionProps) {
  if (pageLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Henter arkiverede beskeder...
      </div>
    );
  }

  if (messageCount === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Intet arkiv endnu
        </h2>

        <p className="mt-2">Du har ingen arkiverede beskeder lige nu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSwitchSection("received")}
            className={`rounded-xl px-4 py-3 text-left transition ${
              activeSection === "received"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">Modtagne</div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  activeSection === "received"
                    ? "bg-white text-gray-900 dark:bg-gray-950 dark:text-white"
                    : "bg-white text-gray-700 dark:bg-gray-950 dark:text-gray-200"
                }`}
              >
                {receivedCount}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSwitchSection("sent")}
            className={`rounded-xl px-4 py-3 text-left transition ${
              activeSection === "sent"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">Sendte</div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  activeSection === "sent"
                    ? "bg-white text-gray-900 dark:bg-gray-950 dark:text-white"
                    : "bg-white text-gray-700 dark:bg-gray-950 dark:text-gray-200"
                }`}
              >
                {sentCount}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Viser {activeCount} {activeSectionLabel.toLowerCase()} arkiverede
        beskeder.
      </div>

      {activeCount === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          {emptyText}
        </div>
      )}

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
                  const isRestoring = restoringMessageId === message.id;
                  const targetLabel = getRestoreTargetLabel(activeSection);

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
                              <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-white dark:bg-gray-600">
                                Arkiveret
                              </span>

                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${
                                  activeSection === "sent"
                                    ? "bg-purple-600"
                                    : "bg-green-600"
                                }`}
                              >
                                {activeSection === "sent" ? "Sendt" : "Modtaget"}
                              </span>

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
                              {activeSection === "sent" ? "Til: " : "Fra: "}
                              {activeSection === "sent"
                                ? message.isBroadcast
                                  ? "Alle"
                                  : getUserName(message.receiver) || "Ukendt"
                                : getUserName(message.sender) || "System"}
                            </p>

                            {!isExpanded && (
                              <p className="mt-2 line-clamp-1 text-sm text-gray-600 dark:text-gray-300">
                                {getShortBody(message.body)}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-sm text-gray-400 dark:text-gray-500 md:text-right">
                            Arkiveret: {getArchivedDateLabel(message)}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-4 border-t border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                          <div className="grid gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <div>
                              Fra: {getUserName(message.sender) || "System"}
                            </div>

                            <div>
                              Til:{" "}
                              {message.isBroadcast
                                ? "Alle"
                                : getUserName(message.receiver) || "Dig"}
                            </div>

                            <div>Sendt: {formatDateTime(message.createdAt)}</div>

                            <div>
                              Arkiveret: {getArchivedDateLabel(message)}
                            </div>
                          </div>

                          <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                            {message.body || "Ingen beskedtekst."}
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                onConfirmRestoreMessage(message, activeSection)
                              }
                              disabled={isRestoring}
                              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                            >
                              {isRestoring
                                ? "Flytter tilbage..."
                                : `Flyt tilbage til ${targetLabel}`}
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
