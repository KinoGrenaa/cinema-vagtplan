"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type Message = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  archivedAt?: string | null;
  sender?: User | null;
  receiver?: User | null;
  isBroadcast: boolean;
};

type ArchiveSection = "received" | "sent";

type MessageDateGroup = {
  dateKey: string;
  dateLabel: string;
  messages: Message[];
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {
    // Brug fallback hvis svaret ikke er JSON.
  }

  return fallback;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

function getTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getSentDateKey(message: Message) {
  const date = new Date(message.createdAt);

  if (Number.isNaN(date.getTime())) {
    return "ukendt";
  }

  return dateToLocalDateString(date);
}

function formatDateGroupLabel(dateKey: string) {
  if (dateKey === "ukendt") {
    return "Ukendt sendtdato";
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return "Ukendt sendtdato";
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  }).format(date);

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDateDK(
    date,
  )}`;
}

function getArchivedDateLabel(message: Message) {
  if (!message.archivedAt) {
    return "Ukendt arkiveringstidspunkt";
  }

  return formatDateTime(message.archivedAt);
}

function groupMessagesBySentDate(messages: Message[]): MessageDateGroup[] {
  const sortedMessages = [...messages].sort(
    (left, right) =>
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt),
  );

  return sortedMessages.reduce<MessageDateGroup[]>((groups, message) => {
    const dateKey = getSentDateKey(message);
    const existingGroup = groups.find((group) => group.dateKey === dateKey);

    if (existingGroup) {
      existingGroup.messages.push(message);
      return groups;
    }

    groups.push({
      dateKey,
      dateLabel: formatDateGroupLabel(dateKey),
      messages: [message],
    });

    return groups;
  }, []);
}

function getMessageArchiveSection(
  message: Message,
  currentUserId?: number,
): ArchiveSection {
  return currentUserId && message.sender?.id === currentUserId
    ? "sent"
    : "received";
}

function getRestoreTargetLabel(section: ArchiveSection) {
  return section === "sent" ? "sendte beskeder" : "indbakken";
}

function getArchiveSectionLabel(section: ArchiveSection) {
  return section === "sent" ? "Sendte" : "Modtagne";
}

export default function ArchivedMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const confirmDialog = useConfirm();

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSection, setActiveSection] =
    useState<ArchiveSection>("received");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [restoringMessageId, setRestoringMessageId] = useState<number | null>(
    null,
  );
  const errorDialog = useInfoModal();

  const fetchMessages = useCallback(
    async (showLoading = true) => {
      if (!user) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }

        const response = await apiFetch("/messages/archive");

        if (!response.ok) {
          errorDialog.showError(
            "Kunne ikke hente arkiverede beskeder",
            await readErrorMessage(
              response,
              "Der opstod en fejl under hentning af arkiverede beskeder.",
            ),
          );

          setMessages([]);
          return;
        }

        const data = await response.json();

        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        errorDialog.showError(
          "Kunne ikke hente arkiverede beskeder",
          error instanceof Error
            ? error.message
            : "Der opstod en uventet fejl under hentning af arkiverede beskeder.",
        );

        setMessages([]);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [user],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchMessages();
  }, [authLoading, fetchMessages, user]);

  const refreshMessagesSilently = useCallback(() => {
    fetchMessages(false);
  }, [fetchMessages]);

  useRealtimeCore({
    onMessage: refreshMessagesSilently,
  });

  const receivedMessages = useMemo(() => {
    return messages.filter(
      (message) => getMessageArchiveSection(message, user?.id) === "received",
    );
  }, [messages, user?.id]);

  const sentMessages = useMemo(() => {
    return messages.filter(
      (message) => getMessageArchiveSection(message, user?.id) === "sent",
    );
  }, [messages, user?.id]);

  const activeMessages =
    activeSection === "sent" ? sentMessages : receivedMessages;

  const groupedMessages = useMemo(() => {
    return groupMessagesBySentDate(activeMessages);
  }, [activeMessages]);

  useEffect(() => {
    setExpandedDateKeys((current) => {
      const validKeys = groupedMessages.map((group) => group.dateKey);

      if (validKeys.length === 0) {
        return [];
      }

      const currentValidKeys = current.filter((dateKey) =>
        validKeys.includes(dateKey),
      );
      const latestDateKey = validKeys[0];
      const nextKeys = currentValidKeys.includes(latestDateKey)
        ? currentValidKeys
        : [latestDateKey, ...currentValidKeys];

      const isUnchanged =
        nextKeys.length === current.length &&
        nextKeys.every((dateKey, index) => dateKey === current[index]);

      return isUnchanged ? current : nextKeys;
    });
  }, [groupedMessages]);

  function switchSection(section: ArchiveSection) {
    setActiveSection(section);
    setExpandedMessageId(null);
    setExpandedDateKeys([]);
  }

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  function getUserName(messageUser?: User | null) {
    if (!messageUser) return null;
    return `${messageUser.firstName} ${messageUser.lastName}`;
  }

  function getShortBody(body: string) {
    if (!body) return "Ingen beskedtekst.";
    return body.length > 120 ? `${body.slice(0, 120)}...` : body;
  }

  async function restoreMessage(messageId: number, section: ArchiveSection) {
    try {
      setRestoringMessageId(messageId);

      const response = await apiFetch(`/messages/${messageId}/unarchive`, {
        method: "PATCH",
      });

      if (!response.ok) {
        errorDialog.showError(
          "Kunne ikke flytte beskeden tilbage",
          await readErrorMessage(
            response,
            `Der opstod en fejl under flytning af beskeden tilbage til ${getRestoreTargetLabel(
              section,
            )}.`,
          ),
        );

        return;
      }

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== messageId),
      );
      setExpandedMessageId((currentId) =>
        currentId === messageId ? null : currentId,
      );
    } catch (error) {
      errorDialog.showError(
        "Kunne ikke flytte beskeden tilbage",
        error instanceof Error
          ? error.message
          : `Der opstod en uventet fejl under flytning af beskeden tilbage til ${getRestoreTargetLabel(
              section,
            )}.`,
      );
    } finally {
      setRestoringMessageId(null);
    }
  }

  function confirmRestoreMessage(message: Message, section: ArchiveSection) {
    const targetLabel = getRestoreTargetLabel(section);

    confirmDialog.confirm({
      title: "Flyt besked tilbage",
      description: `Vil du flytte "${message.subject}" tilbage til ${targetLabel}?`,
      confirmText: "Flyt tilbage",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        await restoreMessage(message.id, section);
      },
    });
  }

  const pageLoading = authLoading || loading;
  const messageCount = messages.length;
  const activeCount = activeMessages.length;
  const activeSectionLabel = getArchiveSectionLabel(activeSection);
  const emptyText =
    activeSection === "sent"
      ? "Du har ingen sendte arkiverede beskeder."
      : "Du har ingen modtagne arkiverede beskeder.";

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Arkiverede beskeder</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Skift mellem modtagne og sendte arkiverede beskeder. Beskederne er
            grupperet efter sendtdato.
          </p>
        </div>

        {pageLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter arkiverede beskeder...
          </div>
        )}

        {!pageLoading && messageCount === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Intet arkiv endnu
            </h2>

            <p className="mt-2">Du har ingen arkiverede beskeder lige nu.</p>
          </div>
        )}

        {!pageLoading && messageCount > 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => switchSection("received")}
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
                      {receivedMessages.length}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => switchSection("sent")}
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
                      {sentMessages.length}
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
                    onClick={() => toggleDateGroup(group.dateKey)}
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
                        const targetLabel =
                          getRestoreTargetLabel(activeSection);

                        return (
                          <article key={message.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMessageId(
                                  isExpanded ? null : message.id,
                                )
                              }
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
                                      {activeSection === "sent"
                                        ? "Sendt"
                                        : "Modtaget"}
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
                                    {activeSection === "sent"
                                      ? "Til: "
                                      : "Fra: "}
                                    {activeSection === "sent"
                                      ? message.isBroadcast
                                        ? "Alle"
                                        : getUserName(message.receiver) ||
                                          "Ukendt"
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
                                    Fra:{" "}
                                    {getUserName(message.sender) || "System"}
                                  </div>

                                  <div>
                                    Til:{" "}
                                    {message.isBroadcast
                                      ? "Alle"
                                      : getUserName(message.receiver) || "Dig"}
                                  </div>

                                  <div>
                                    Sendt: {formatDateTime(message.createdAt)}
                                  </div>

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
                                      confirmRestoreMessage(
                                        message,
                                        activeSection,
                                      )
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
        )}

        <ConfirmModal
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmVariant={confirmDialog.confirmVariant}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.handleConfirm}
          onCancel={confirmDialog.handleCancel}
        />

        <InfoModal
          open={errorDialog.open}
          title={errorDialog.title}
          description={errorDialog.description}
          buttonText={errorDialog.buttonText}
          variant={errorDialog.variant}
          onClose={errorDialog.close}
        />
      </div>
    </main>
  );
}
