"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";
import { useMessages } from "../../../hooks/useMessages";
import type { Message, MessageParticipant } from "../../../types/messages";

type ErrorDialogState = {
  open: boolean;
  title: string;
  description: string;
};

type MessageDateGroup = {
  dateKey: string;
  dateLabel: string;
  messages: Message[];
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
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

function getTimestamp(value: string) {
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

function groupMessagesBySentDate(messages: Message[]): MessageDateGroup[] {
  const sortedBySentDate = [...messages].sort(
    (left, right) =>
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt),
  );

  return sortedBySentDate.reduce<MessageDateGroup[]>((groups, message) => {
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

export default function SentMessagesPage() {
  const confirmDialog = useConfirm();
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null,
  );
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });

  const showErrorDialog = useCallback((title: string, description: string) => {
    setErrorDialog({
      open: true,
      title,
      description,
    });
  }, []);

  const handleMessagesError = useCallback(
    (message: string) => {
      showErrorDialog("Kunne ikke hente sendte beskeder", message);
    },
    [showErrorDialog],
  );

  const { loading, sortedMessages, archive } = useMessages({
    mode: "sent",
    onError: handleMessagesError,
  });

  const groupedMessages = useMemo(() => {
    return groupMessagesBySentDate(sortedMessages);
  }, [sortedMessages]);

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

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  function getUserName(user?: MessageParticipant | null) {
    if (!user) return null;
    return `${user.firstName} ${user.lastName}`;
  }

  function getShortBody(body: string) {
    if (!body) return "Ingen beskedtekst.";
    return body.length > 120 ? `${body.slice(0, 120)}...` : body;
  }

  function handleArchive(messageId: number) {
    confirmDialog.confirm({
      title: "Arkiver besked",
      description: "Vil du arkivere denne besked?",
      confirmText: "Arkiver",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          await archive(messageId);

          if (expandedMessageId === messageId) {
            setExpandedMessageId(null);
          }
        } catch (error) {
          showErrorDialog(
            "Beskeden kunne ikke arkiveres",
            getErrorMessage(
              error,
              "Der opstod en fejl, da beskeden skulle arkiveres. Prøv igen.",
            ),
          );
        }
      },
    });
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Sendte beskeder</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Her kan du se beskeder, du selv har sendt.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter sendte beskeder...
          </div>
        )}

        {!loading && sortedMessages.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Ingen sendte beskeder
            </h2>

            <p className="mt-2">Du har ikke sendt nogen beskeder endnu.</p>
          </div>
        )}

        {!loading && sortedMessages.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Viser {sortedMessages.length} sendte beskeder grupperet efter
              sendtdato.
            </div>

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
                                    Til:{" "}
                                    {message.isBroadcast
                                      ? "Alle"
                                      : getUserName(message.receiver) ||
                                        "Ukendt"}
                                  </p>

                                  {!isExpanded && (
                                    <p className="mt-2 line-clamp-1 text-sm text-gray-600 dark:text-gray-300">
                                      {getShortBody(message.body)}
                                    </p>
                                  )}
                                </div>

                                <div className="shrink-0 text-sm text-gray-400 dark:text-gray-500 md:text-right">
                                  {formatDateTime(message.createdAt)}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="space-y-4 border-t border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                                <div className="grid gap-1 text-sm text-gray-500 dark:text-gray-400">
                                  <div>
                                    Fra: {getUserName(message.sender) || "Dig"}
                                  </div>

                                  <div>
                                    Til:{" "}
                                    {message.isBroadcast
                                      ? "Alle"
                                      : getUserName(message.receiver) ||
                                        "Ukendt"}
                                  </div>

                                  <div>
                                    Sendt: {formatDateTime(message.createdAt)}
                                  </div>
                                </div>

                                <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                                  {message.body || "Ingen beskedtekst."}
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleArchive(message.id)}
                                    className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-200 dark:text-black dark:hover:bg-white"
                                  >
                                    Arkiver
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
      </div>

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
        buttonText="OK"
        variant="error"
        onClose={() =>
          setErrorDialog({
            open: false,
            title: "",
            description: "",
          })
        }
      />
    </main>
  );
}
