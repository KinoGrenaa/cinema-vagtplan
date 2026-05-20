"use client";

import { useCallback, useEffect, useState } from "react";

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

export default function MessageArchivePage() {
  const [messages, setMessages] = useState<Message[]>([]);

  function getHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchMessages = useCallback(async () => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    const response = await fetch(
      `http://localhost:3001/messages/archive?userId=${user.id}&cinemaId=${user.cinemaId}`,
      {
        headers: getHeaders(),
      }
    );

    const data = await response.json();

    setMessages(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">Beskedarkiv</h1>

        <p className="text-gray-500 mt-2">
          Arkiverede beskeder gemmes stadig i systemet.
        </p>
      </div>

      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="bg-white rounded-xl shadow p-5"
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {message.isBroadcast && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  Broadcast
                </span>
              )}

              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                Arkiveret
              </span>
            </div>

            <h2 className="text-xl font-bold">
              {message.subject}
            </h2>

            <div className="text-sm text-gray-500 mt-1">
              Fra:{" "}
              {message.sender
                ? `${message.sender.firstName} ${message.sender.lastName}`
                : "System"}
            </div>

            <div className="text-sm text-gray-500">
              Til:{" "}
              {message.isBroadcast
                ? "Alle"
                : message.receiver
                ? `${message.receiver.firstName} ${message.receiver.lastName}`
                : "Ukendt"}
            </div>

            <div className="text-sm text-gray-500 mb-4">
              {new Date(message.createdAt).toLocaleString("da-DK")}
            </div>

            <div className="whitespace-pre-wrap">
              {message.body}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-gray-500">
            Ingen arkiverede beskeder.
          </div>
        )}
      </div>
    </main>
  );
}