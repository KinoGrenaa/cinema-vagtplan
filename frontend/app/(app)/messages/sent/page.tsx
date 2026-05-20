"use client";

import { useEffect, useMemo, useState } from "react";

type Message = {
  id: string;
  subject?: string;
  title?: string;
  body?: string;
  message?: string;
  content?: string;
  createdAt?: string;
  recipients?: { name?: string; email?: string }[];
  recipientNames?: string[];
};

export default function SentMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const savedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!savedUser || !token) {
          setMessages([]);
          return;
        }

        const response = await fetch("http://localhost:3001/messages", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
        const errorText = await response.text();

        console.log("Fejl fra backend:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        });

        setMessages([]);
        return;
        }

        const data = await response.json();

        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const dateA = new Date(a.createdAt ?? 0).getTime();
      const dateB = new Date(b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
  }, [messages]);

  const getTitle = (message: Message) =>
    message.subject || message.title || "Uden emne";

  const getBody = (message: Message) =>
    message.body || message.message || message.content || "";

  const getPreview = (text: string) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length > 110 ? `${cleaned.slice(0, 110)}...` : cleaned;
  };

  const getRecipients = (message: Message) => {
    if (message.recipients?.length) {
      return message.recipients
        .map((r) => r.name || r.email)
        .filter(Boolean)
        .join(", ");
    }

    if (message.recipientNames?.length) {
      return message.recipientNames.join(", ");
    }

    return "Ukendte modtagere";
  };

  if (loading) {
    return <div className="p-6">Henter sendte beskeder...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sendte beskeder</h1>
        <p className="text-sm text-gray-500">
          Her kan du se beskeder, du tidligere har sendt.
        </p>
      </div>

      {sortedMessages.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-500">
          Du har ikke sendt nogen beskeder endnu.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMessages.map((message) => {
            const isExpanded = expandedId === message.id;
            const body = getBody(message);

            return (
              <div
                key={message.id}
                className="rounded-xl border bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : message.id)
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold">
                        {getTitle(message)}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Til: {getRecipients(message)}
                      </p>

                      {!isExpanded && (
                        <p className="mt-2 line-clamp-1 text-sm text-gray-700">
                          {getPreview(body)}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-gray-400">
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleString("da-DK")
                          : ""}
                      </div>

                      <div className="mt-2 text-sm font-medium text-blue-600">
                        {isExpanded ? "Skjul" : "Vis mere"}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800">
                      {body || "Ingen beskedtekst"}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Send igen
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                      >
                        Kopier tekst
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