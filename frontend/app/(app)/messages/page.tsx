"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";

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
  isRead?: boolean;
  sender?: User | null;
  receiver?: User | null;
  isBroadcast: boolean;
};

type CurrentUser = {
  id: number;
  cinemaId: number;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null
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
        `process.env.NEXT_PUBLIC_API_URL!/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
        {
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Kunne ikke hente beskeder", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useRealtimeMessages({
    onNewMessage: fetchMessages,
    onMessageRead: fetchMessages,
    onMessageArchived: fetchMessages,
    onMessagesUpdated: fetchMessages,
    onMessageRecalled: fetchMessages,
  });

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  }, [messages]);

  function getUserName(user?: User | null) {
    if (!user) return null;
    return `${user.firstName} ${user.lastName}`;
  }

  function getShortBody(body: string) {
    if (!body) return "Ingen beskedtekst.";
    return body.length > 120
      ? `${body.slice(0, 120)}...`
      : body;
  }

  async function markAsRead(messageId: number) {
    try {
      const response = await fetch(
        `process.env.NEXT_PUBLIC_API_URL!/messages/${messageId}/read`,
        {
          method: "PATCH",
          headers: getHeaders(),
        }
      );

      if (!response.ok) return;

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                isRead: true,
              }
            : message
        )
      );
    } catch (error) {
      console.error(
        "Kunne ikke markere besked som læst",
        error
      );
    }
  }

  async function archiveMessage(messageId: number) {
    const confirmed = confirm(
      "Vil du arkivere denne besked?"
    );

    if (!confirmed) return;

    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        alert("Bruger ikke fundet.");
        return;
      }

      const user: CurrentUser = JSON.parse(savedUser);

      const response = await fetch(
        `process.env.NEXT_PUBLIC_API_URL!/messages/${messageId}/archive`,
        {
          method: "PATCH",
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Kunne ikke arkivere beskeden"
        );
      }

      setMessages((currentMessages) =>
        currentMessages.filter(
          (message) => message.id !== messageId
        )
      );

      if (expandedMessageId === messageId) {
        setExpandedMessageId(null);
      }
    } catch (error) {
      console.error(error);
      alert("Beskeden kunne ikke arkiveres.");
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">
          Indbakke
        </h1>

        <p className="text-gray-500 mt-2">
          Her kan du se beskeder, der er sendt til
          dig.
        </p>
      </div>

      {loading && (
        <div className="bg-white rounded-xl shadow p-6 text-gray-500">
          Henter beskeder...
        </div>
      )}

      {!loading && sortedMessages.length === 0 && (
        <div className="bg-white rounded-xl shadow p-6 text-gray-500">
          Ingen beskeder.
        </div>
      )}

      {!loading && sortedMessages.length > 0 && (
        <div className="space-y-3">
          {sortedMessages.map((message) => {
            const isExpanded =
              expandedMessageId === message.id;

            return (
              <div
                key={message.id}
                className={`rounded-xl shadow overflow-hidden ${
                  message.isRead
                    ? "bg-white"
                    : "bg-blue-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !isExpanded &&
                      !message.isRead
                    ) {
                      markAsRead(message.id);
                    }

                    setExpandedMessageId(
                      isExpanded ? null : message.id
                    );
                  }}
                  className="w-full text-left p-5 hover:bg-gray-50 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {!message.isRead && (
                          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                            Ulæst
                          </span>
                        )}

                        {message.isBroadcast && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            Sendt til alle
                          </span>
                        )}

                        </div>

                      <h2
                        className={`text-lg truncate ${
                          message.isRead
                            ? "font-medium text-gray-700"
                            : "font-bold text-black"
                        }`}
                      >
                        {message.subject}
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Fra:{" "}
                        {getUserName(
                          message.sender
                        ) || "System"}
                      </p>

                      {!isExpanded && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                          {getShortBody(
                            message.body
                          )}
                        </p>
                      )}
                    </div>

                    <div className="text-sm text-gray-400 md:text-right shrink-0">
                      {new Date(
                        message.createdAt
                      ).toLocaleString("da-DK")}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t p-5 space-y-4 bg-white">
                    <div className="grid gap-1 text-sm text-gray-500">
                      <div>
                        Fra:{" "}
                        {getUserName(
                          message.sender
                        ) || "System"}
                      </div>

                      <div>
                        Til:{" "}
                        {message.isBroadcast
                          ? "Alle"
                          : getUserName(
                              message.receiver
                            ) || "Dig"}
                      </div>

                      <div>
                        Sendt:{" "}
                        {new Date(
                          message.createdAt
                        ).toLocaleString("da-DK")}
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap text-gray-800">
                      {message.body ||
                        "Ingen beskedtekst."}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          archiveMessage(
                            message.id
                          )
                        }
                        className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                      >
                        Arkiver
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}