"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number;
};

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
  readAt?: string | null;
  archivedAt?: string | null;
  recalledAt?: string | null;
  isBroadcast: boolean;
  senderId: number;
  receiverId?: number | null;
  sender?: User | null;
  receiver?: User | null;
};

export default function MessagesInboxPage() {
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
    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);
    setCurrentUser(user);

    const response = await fetch(
      `http://localhost:3001/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
      { headers: getHeaders() }
    );

    const data = await response.json();
    setMessages(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function markAsRead(messageId: number) {
    const response = await fetch(
      `http://localhost:3001/messages/${messageId}/read`,
      {
        method: "PATCH",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      setStatusMessage("Kunne ikke markere beskeden som læst");
      return;
    }

    setStatusMessage("Besked markeret som læst");
    await fetchMessages();
  }

  async function archiveMessage(messageId: number) {
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

    const data = await response.json();

    if (!response.ok) {
      setStatusMessage(data.message || "Kunne ikke arkivere beskeden");
      return;
    }

    setStatusMessage("Beskeden er arkiveret.");
    await fetchMessages();
  }

  const receivedMessages = useMemo(() => {
    if (!currentUser) return [];

    return messages.filter((message) => {
      if (message.archivedAt || message.recalledAt) return false;
      if (message.senderId === currentUser.id) return false;

      return (
        message.receiverId === currentUser.id ||
        message.receiver?.id === currentUser.id ||
        message.isBroadcast
      );
    });
  }, [messages, currentUser]);

  const unreadMessages = receivedMessages.filter((message) => !message.readAt);
  const readMessages = receivedMessages.filter((message) => message.readAt);

  function renderMessage(message: Message) {
    const unread = !message.readAt;

    return (
      <div key={message.id} className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-2">
          {unread && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              Ulæst
            </span>
          )}

          {message.isBroadcast && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              Alle
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold">{message.subject}</h3>

        <p className="text-sm text-gray-600 mb-3">
          Fra:{" "}
          {message.sender
            ? `${message.sender.firstName} ${message.sender.lastName}`
            : "System"}{" "}
          · {new Date(message.createdAt).toLocaleString("da-DK")}
        </p>

        <p className="whitespace-pre-wrap mb-4">{message.body}</p>

        <div className="flex flex-wrap gap-2">
          {unread && (
            <button
              onClick={() => markAsRead(message.id)}
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              Marker som læst
            </button>
          )}

          <a
            href={`/messages/send?replyTo=${message.senderId}&subject=${encodeURIComponent(
              `Re: ${message.subject}`
            )}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Svar
          </a>

          <button
            onClick={() => archiveMessage(message.id)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
          >
            Arkiver
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Modtagne beskeder</h1>

      {statusMessage && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
          {statusMessage}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Ulæste beskeder ({unreadMessages.length})
        </h2>

        {unreadMessages.map(renderMessage)}

        {unreadMessages.length === 0 && <p>Du har ingen ulæste beskeder.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Læste beskeder ({readMessages.length})
        </h2>

        {readMessages.map(renderMessage)}

        {readMessages.length === 0 && <p>Du har ingen læste beskeder.</p>}
      </section>
    </main>
  );
}