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
  isBroadcast: boolean;
  sender?: { firstName: string; lastName: string };
  receiver?: { id: number; firstName: string; lastName: string } | null;
};

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);

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

    const response = await fetch(
      `http://localhost:3001/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
      { headers: getHeaders() }
    );

    const data = await response.json();
    setMessages(Array.isArray(data) ? data : []);
  }, []);

  const fetchUsers = useCallback(async () => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    const response = await fetch(
      `http://localhost:3001/users?cinemaId=${user.cinemaId}`,
      { headers: getHeaders() }
    );

    const data = await response.json();
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchMessages();
    fetchUsers();
  }, [fetchMessages, fetchUsers]);

  async function sendMessage() {
    if (!currentUser) return;

    if (!subject.trim() || !body.trim()) {
      setStatusMessage("Udfyld både emne og besked.");
      return;
    }

    if (!isBroadcast && !receiverId) {
      setStatusMessage("Vælg en modtager eller send til alle.");
      return;
    }

    const response = await fetch("http://localhost:3001/messages", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        subject,
        body,
        cinemaId: currentUser.cinemaId,
        senderId: currentUser.id,
        receiverId: isBroadcast ? null : Number(receiverId),
        isBroadcast,
      }),
    });

    if (!response.ok) {
      setStatusMessage("Beskeden kunne ikke sendes.");
      return;
    }

    setSubject("");
    setBody("");
    setReceiverId("");
    setIsBroadcast(false);
    setStatusMessage("Besked sendt.");

    await fetchMessages();
  }

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

  const visibleMessages = useMemo(() => {
    if (!currentUser) return [];

    return messages.filter((message) => {
      if (message.isBroadcast) return true;
      return message.receiver?.id === currentUser.id || !message.receiver;
    });
  }, [messages, currentUser]);

  const unreadMessages = visibleMessages.filter((message) => !message.readAt);
  const readMessages = visibleMessages.filter((message) => message.readAt);

  function renderMessage(message: Message) {
    const unread = !message.readAt;

    return (
      <div key={message.id} className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex gap-2 mb-2">
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
          · Til:{" "}
          {message.isBroadcast
            ? "Alle"
            : message.receiver
            ? `${message.receiver.firstName} ${message.receiver.lastName}`
            : "Ukendt"}{" "}
          · {new Date(message.createdAt).toLocaleString("da-DK")}
        </p>

        <p className="whitespace-pre-wrap mb-4">{message.body}</p>

        {unread && (
          <button
            onClick={() => markAsRead(message.id)}
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            Marker som læst
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Beskeder</h1>

      <section className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-xl font-bold">Send besked</h2>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Emne"
          className="w-full border rounded-lg p-2"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Skriv besked..."
          className="w-full border rounded-lg p-2 min-h-32"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isBroadcast}
            onChange={(e) => setIsBroadcast(e.target.checked)}
          />
          Send til alle
        </label>

        {!isBroadcast && (
          <select
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">Vælg modtager</option>
            {users
              .filter((user) => user.id !== currentUser?.id)
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
          </select>
        )}

        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          Send besked
        </button>
      </section>

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
          Tidligere beskeder ({readMessages.length})
        </h2>

        {readMessages.map(renderMessage)}

        {readMessages.length === 0 && <p>Du har ingen tidligere beskeder.</p>}
      </section>
    </main>
  );
}