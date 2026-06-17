"use client";

import { useEffect, useMemo, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { formatDateDK, formatTimeDK } from "@/app/utils/dateTime";

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
  sender?: User | null;
  receiver?: User | null;
  isBroadcast: boolean;
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

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function ArchivedMessagesPage() {
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [restoringMessageId, setRestoringMessageId] = useState<number | null>(
    null,
  );
  const errorDialog = useInfoModal();

  async function fetchMessages() {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchMessages();
  }, [authLoading, user]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt),
    );
  }, [messages]);

  function getUserName(messageUser?: User | null) {
    if (!messageUser) return null;
    return `${messageUser.firstName} ${messageUser.lastName}`;
  }

  function getShortBody(body: string) {
    if (!body) return "Ingen beskedtekst.";
    return body.length > 120 ? `${body.slice(0, 120)}...` : body;
  }

  async function restoreMessage(messageId: number) {
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
            "Der opstod en fejl under flytning af beskeden tilbage til indbakken.",
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
          : "Der opstod en uventet fejl under flytning af beskeden tilbage til indbakken.",
      );
    } finally {
      setRestoringMessageId(null);
    }
  }

  const pageLoading = authLoading || loading;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Arkiverede beskeder</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Her kan du se beskeder, du tidligere har arkiveret, og flytte dem
            tilbage til indbakken.
          </p>
        </div>

        {pageLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter arkiverede beskeder...
          </div>
        )}

        {!pageLoading && sortedMessages.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <div className="mb-2 text-4xl">Arkiv</div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Intet arkiv endnu
            </h2>

            <p className="mt-2">Du har ingen arkiverede beskeder lige nu.</p>
          </div>
        )}

        {!pageLoading && sortedMessages.length > 0 && (
          <div className="space-y-3">
            {sortedMessages.map((message) => {
              const isExpanded = expandedMessageId === message.id;
              const isRestoring = restoringMessageId === message.id;

              return (
                <div
                  key={message.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMessageId(isExpanded ? null : message.id)
                    }
                    className="w-full p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-white dark:bg-gray-600">
                            Arkiveret
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
                          Fra: {getUserName(message.sender) || "System"}
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
                          Fra: {getUserName(message.sender) || "System"}
                        </div>

                        <div>
                          Til:{" "}
                          {message.isBroadcast
                            ? "Alle"
                            : getUserName(message.receiver) || "Dig"}
                        </div>

                        <div>Sendt: {formatDateTime(message.createdAt)}</div>
                      </div>

                      <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                        {message.body || "Ingen beskedtekst."}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => restoreMessage(message.id)}
                          disabled={isRestoring}
                          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                        >
                          {isRestoring
                            ? "Flytter tilbage..."
                            : "Flyt tilbage til indbakke"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
