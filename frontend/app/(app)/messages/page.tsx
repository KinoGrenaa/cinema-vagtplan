"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number;
};

type Message = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  isBroadcast: boolean;
  sender?: {
    firstName: string;
    lastName: string;
  };
  receiver?: {
    firstName: string;
    lastName: string;
  } | null;
};

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchMessages = useCallback(async () => {
    const savedUser = localStorage.getItem("user");

if (!savedUser) {
  return;
}

const user: CurrentUser = JSON.parse(savedUser);

const response = await fetch(
  `http://localhost:3001/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
  {
    headers: getHeaders(),
  },
);

    const data = await response.json();
    setMessages(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchMessages();
  }, [fetchMessages]);

  const visibleMessages = useMemo(() => {
    if (!currentUser) return [];

    return messages.filter((message) => {
      if (message.isBroadcast) return true;
      return message.receiver?.id === currentUser.id || !message.receiver;
    });
  }, [messages, currentUser]);

  const unreadMessages = useMemo(() => {
    return visibleMessages.filter((message) => !message.readAt);
  }, [visibleMessages]);

  const readMessages = useMemo(() => {
    return visibleMessages.filter((message) => message.readAt);
  }, [visibleMessages]);

  async function markAsRead(messageId: number) {
    const response = await fetch(
      `http://localhost:3001/messages/${messageId}/read`,
      {
        method: "PATCH",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      setStatusMessage("Kunne ikke markere beskeden som læst");
      return;
    }

    setStatusMessage("Besked markeret som læst");
    await fetchMessages();
  }

  function isShiftTradeMessage(message: Message) {
    const text = `${message.subject} ${message.body}`.toLowerCase();

    return (
      text.includes("vagt") ||
      text.includes("vagtbytte") ||
      text.includes("pulje")
    );
  }

  function renderMessage(message: Message) {
    const unread = !message.readAt;
    const shiftTrade = isShiftTradeMessage(message);

    return (
      <div
        key={message.id}
        className={`border rounded-xl p-4 ${
          unread ? "bg-blue-50 border-blue-200" : "bg-white"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {unread && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  Ulæst
                </span>
              )}

              {message.isBroadcast && (
                <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded-full">
                  Alle
                </span>
              )}

              {shiftTrade && (
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  Vagtbytte
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold">{message.subject}</h2>

            <div className="text-sm text-gray-500 mt-1">
              Fra:{" "}
              <strong>
                {message.sender
                  ? `${message.sender.firstName} ${message.sender.lastName}`
                  : "System"}
              </strong>
              {" · "}
              Til:{" "}
              <strong>
                {message.isBroadcast
                  ? "Alle"
                  : message.receiver
                    ? `${message.receiver.firstName} ${message.receiver.lastName}`
                    : "Ukendt"}
              </strong>
              {" · "}
              {new Date(message.createdAt).toLocaleString("da-DK")}
            </div>

            <p className="mt-4 whitespace-pre-line">{message.body}</p>
          </div>

          {unread && (
            <button
              onClick={() => markAsRead(message.id)}
              className="bg-black text-white px-4 py-2 rounded-lg min-w-36"
            >
              Marker som læst
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Beskeder</h1>
        <p className="text-gray-500">
          Her kan du se beskeder, notifikationer og vagtbytte-opdateringer.
        </p>
      </div>

      {statusMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          {statusMessage}
        </div>
      )}

      <section className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Ulæste beskeder ({unreadMessages.length})
        </h2>

        <div className="space-y-3">
          {unreadMessages.map(renderMessage)}

          {unreadMessages.length === 0 && (
            <div className="text-gray-500">Du har ingen ulæste beskeder.</div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">
          Tidligere beskeder ({readMessages.length})
        </h2>

        <div className="space-y-3">
          {readMessages.map(renderMessage)}

          {readMessages.length === 0 && (
            <div className="text-gray-500">
              Du har ingen tidligere beskeder.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}