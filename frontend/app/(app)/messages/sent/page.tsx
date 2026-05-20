"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: number;
  cinemaId: number;
};

type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type Message = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  archivedAt?: string | null;
  recalledAt?: string | null;

  systemType?: string | null;
  relatedShiftTradeId?: number | null;

  isBroadcast?: boolean;
  senderId?: number;
  receiverId?: number | null;

  sender?: User | null;
  receiver?: User | null;
  systemType?: string | null;
  relatedShiftTradeId?: number | null;
};

export default function SentMessagesPage() {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [statusMessage, setStatusMessage] =
    useState("");

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem(
        "token"
      )}`,
    };
  }

  const fetchMessages = useCallback(async () => {
    try {
      const savedUser =
        localStorage.getItem("user");

      if (!savedUser) {
        setMessages([]);
        return;
      }

      const user: CurrentUser =
        JSON.parse(savedUser);

      setCurrentUser(user);

      const response = await fetch(
        `http://localhost:3001/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
        {
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        setMessages([]);
        return;
      }

      const data = await response.json();

      const sentOnly = Array.isArray(data)
        ? data.filter(
            (message: Message) =>
              message.senderId === user.id ||
              message.sender?.id === user.id
          )
        : [];

      setMessages(sentOnly);
    } catch (error) {
      console.log(
        "Kunne ikke hente sendte beskeder:",
        error
      );

      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function recallMessage(
    messageId: number
  ) {
    if (!currentUser) return;

    const confirmed = window.confirm(
      "Er du sikker på, at du vil fortryde afsendelsen? Beskeden kan kun trækkes tilbage, hvis modtageren ikke har læst den."
    );

    if (!confirmed) return;

    const response = await fetch(
      `http://localhost:3001/messages/${messageId}/recall`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          userId: currentUser.id,
        }),
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      setStatusMessage(
        data?.message ||
          "Beskeden kunne ikke trækkes tilbage."
      );

      return;
    }

    setStatusMessage(
      "Beskeden er trukket tilbage."
    );

    await fetchMessages();
  }

  async function archiveMessage(
    messageId: number
  ) {
    if (!currentUser) return;

    const confirmed = window.confirm(
      "Er du sikker på, at du vil arkivere denne besked?"
    );

    if (!confirmed) return;

    const response = await fetch(
      `http://localhost:3001/messages/${messageId}/archive`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          userId: currentUser.id,
        }),
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      setStatusMessage(
        data?.message ||
          "Kunne ikke arkivere beskeden."
      );

      return;
    }

    setStatusMessage(
      "Beskeden er arkiveret."
    );

    await fetchMessages();
  }

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  }, [messages]);

  function getReceiverName(
    message: Message
  ) {
    if (message.isBroadcast) {
      return "Alle medarbejdere";
    }

    if (!message.receiver) {
      return "Ukendt modtager";
    }

    const fullName = `${message.receiver.firstName ?? ""} ${
      message.receiver.lastName ?? ""
    }`.trim();

    return (
      fullName ||
      message.receiver.email ||
      "Ukendt modtager"
    );
  }

  function getPreview(text: string) {
    const cleanText = text
      .replace(/\s+/g, " ")
      .trim();

    return cleanText.length > 120
      ? `${cleanText.substring(0, 120)}...`
      : cleanText;
  }

  if (loading) {
    return (
      <div className="p-6">
        Henter sendte beskeder...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="mb-2 text-2xl font-bold">
        Sendte beskeder
      </h1>

      <p className="mb-6 text-sm text-gray-500">
        Her kan du se de beskeder, du har sendt.
      </p>

      {statusMessage && (
        <div className="mb-4 rounded-lg border bg-gray-50 p-3 text-sm">
          {statusMessage}
        </div>
      )}

      {sortedMessages.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-500">
          Du har ikke sendt nogen beskeder endnu.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMessages.map((message) => {
            const isExpanded =
              expandedId === message.id;

            const isRead =
              !!message.readAt;

            const isShiftMessage =
            !!message.relatedShiftTradeId ||
            message.systemType === "SHIFT_TRADE" ||
            message.systemType === "SHIFT_TRANSFER" ||
            message.subject?.toLowerCase().includes("vagt");

            return (
              <div
                key={message.id}
                className="rounded-xl border bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(
                      isExpanded
                        ? null
                        : message.id
                    )
                  }
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold">
                          {message.subject ||
                            "Uden emne"}
                        </h2>

                        {isRead ? (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            Læst
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                            Ikke læst
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        Til:{" "}
                        {getReceiverName(
                          message
                        )}
                      </p>

                      {!isExpanded && (
                        <p className="mt-2 line-clamp-1 text-sm text-gray-700">
                          {getPreview(
                            message.body || ""
                          )}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-gray-400">
                        {new Date(
                          message.createdAt
                        ).toLocaleString(
                          "da-DK"
                        )}
                      </div>

                      <div className="mt-2 text-sm font-medium text-blue-600">
                        {isExpanded
                          ? "Skjul"
                          : "Vis mere"}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800">
                      {message.body ||
                        "Ingen beskedtekst"}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                       {!isShiftMessage && !isRead ? (
                        <button
                          type="button"
                          onClick={() =>
                            recallMessage(
                              message.id
                            )
                          }
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                        >
                          Fortryd afsendelse
                        </button>
                      ) : isShiftMessage ? (
                        <div className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                          Vagtbesked kan ikke
                          trækkes tilbage
                        </div>
                      ) : (
                        <div className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                          Allerede læst
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          archiveMessage(
                            message.id
                          )
                        }
                        className="rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-200 hover:text-black"
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
    </div>
  );
}