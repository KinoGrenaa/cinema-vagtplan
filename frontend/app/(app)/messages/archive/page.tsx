"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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

type CurrentUser = {
  id: number;
  cinemaId: number;
};

export default function ArchivedMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  function getHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        setMessages([]);
        return;
      }

      const user: CurrentUser = JSON.parse(savedUser);

      const response = await fetch(
        `${API_URL}/messages/archive?userId=${user.id}&cinemaId=${user.cinemaId}`,
        {
          headers: getHeaders(),
        },
      );

      if (!response.ok) {
        setMessages([]);
        return;
      }

      const data = await response.json();

      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Kunne ikke hente arkiverede beskeder", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [messages]);

  function getUserName(user?: User | null) {
    if (!user) return null;
    return `${user.firstName} ${user.lastName}`;
  }

  function getShortBody(body: string) {
    if (!body) return "Ingen beskedtekst.";
    return body.length > 120 ? `${body.slice(0, 120)}...` : body;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Arkiverede beskeder</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Her kan du se beskeder, du tidligere har arkiveret.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter arkiverede beskeder...
          </div>
        )}

        {!loading && sortedMessages.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <div className="mb-2 text-4xl">🗂️</div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Intet arkiv endnu
            </h2>

            <p className="mt-2">
              Du har endnu ikke arkiveret nogen beskeder.
            </p>
          </div>
        )}

        {!loading && sortedMessages.length > 0 && (
          <div className="space-y-3">
            {sortedMessages.map((message) => {
              const isExpanded = expandedMessageId === message.id;

              return (
                <div
                  key={message.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
                >
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
                        {new Date(message.createdAt).toLocaleString("da-DK")}
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

                        <div>
                          Sendt:{" "}
                          {new Date(message.createdAt).toLocaleString("da-DK")}
                        </div>
                      </div>

                      <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                        {message.body || "Ingen beskedtekst."}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}