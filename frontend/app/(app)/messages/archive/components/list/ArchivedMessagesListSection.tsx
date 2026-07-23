import {
  formatDateTime,
  getArchivedDateLabel,
  getRestoreTargetLabel,
  getShortBody,
  getUserName,
} from "../../helpers/core/archiveMessageHelpers";
import type {
  ArchiveSection,
  Message,
  MessageDateGroup,
} from "../../helpers/core/archiveMessageTypes";

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

const focusClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

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
      <div
        className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
        role="status"
        aria-live="polite"
      >
        Henter arkiverede beskeder...
      </div>
    );
  }

  if (messageCount === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        <h2 className="text-xl font-bold text-gray-950 dark:text-white">
          Intet arkiv endnu
        </h2>
        <p className="mt-2">Du har ingen arkiverede beskeder lige nu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Arkivtype">
          <ArchiveSectionButton
            label="Modtagne"
            count={receivedCount}
            active={activeSection === "received"}
            onClick={() => onSwitchSection("received")}
          />
          <ArchiveSectionButton
            label="Sendte"
            count={sentCount}
            active={activeSection === "sent"}
            onClick={() => onSwitchSection("sent")}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Viser {activeCount} {activeSectionLabel.toLowerCase()} arkiverede
        beskeder.
      </div>

      {activeCount === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
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
              className={`flex w-full flex-col gap-2 border-b border-gray-200 px-5 py-4 text-left transition hover:bg-gray-50 active:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800/70 dark:active:bg-gray-800 md:flex-row md:items-center md:justify-between ${focusClasses}`}
            >
              <div>
                <div className="text-lg font-semibold text-gray-950 dark:text-white">
                  {group.dateLabel}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {group.messages.length} beskeder sendt denne dato
                </div>
              </div>
              <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/70 dark:text-blue-200">
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
                        aria-expanded={isExpanded}
                        className={`w-full p-5 text-left transition hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/70 dark:active:bg-gray-800 ${focusClasses}`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                Arkiveret
                              </span>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  activeSection === "sent"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200"
                                    : "bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-200"
                                }`}
                              >
                                {activeSection === "sent" ? "Sendt" : "Modtaget"}
                              </span>
                              {message.isBroadcast && (
                                <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-200">
                                  Sendt til alle
                                </span>
                              )}
                            </div>

                            <h2 className="truncate text-lg font-bold text-gray-950 dark:text-white">
                              {message.subject}
                            </h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {activeSection === "sent" ? "Til: " : "Fra: "}
                              {activeSection === "sent"
                                ? message.isBroadcast
                                  ? "Alle"
                                  : getUserName(message.receiver) || "Ukendt"
                                : getUserName(message.sender) || "System"}
                            </p>
                            {!isExpanded && (
                              <p className="mt-2 line-clamp-1 text-sm text-gray-700 dark:text-gray-300">
                                {getShortBody(message.body)}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-sm text-gray-500 dark:text-gray-500 md:text-right">
                            Arkiveret: {getArchivedDateLabel(message)}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-4 border-t border-gray-200 bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-gray-950/60">
                          <div className="grid gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <div>Fra: {getUserName(message.sender) || "System"}</div>
                            <div>
                              Til:{" "}
                              {message.isBroadcast
                                ? "Alle"
                                : getUserName(message.receiver) || "Dig"}
                            </div>
                            <div>Sendt: {formatDateTime(message.createdAt)}</div>
                            <div>Arkiveret: {getArchivedDateLabel(message)}</div>
                          </div>

                          <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                            {message.body || "Ingen beskedtekst."}
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                onConfirmRestoreMessage(message, activeSection)
                              }
                              disabled={isRestoring}
                              className={`rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:text-blue-50 dark:bg-blue-500 dark:hover:bg-blue-400 dark:active:bg-blue-600 dark:disabled:bg-blue-950 dark:disabled:text-blue-400 ${focusClasses}`}
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

type ArchiveSectionButtonProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

function ArchiveSectionButton({
  label,
  count,
  active,
  onClick,
}: ArchiveSectionButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-left transition ${focusClasses} ${
        active
          ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400 dark:active:bg-blue-600"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{label}</div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            active
              ? "bg-white/95 text-blue-700 dark:bg-gray-950 dark:text-blue-200"
              : "bg-white text-gray-700 dark:bg-gray-950 dark:text-gray-200"
          }`}
        >
          {count}
        </span>
      </div>
    </button>
  );
}
