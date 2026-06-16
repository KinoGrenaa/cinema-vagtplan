"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Message } from "../types/messages";

import {
  archiveMessage,
  fetchInboxMessages,
  fetchSentMessages,
  markMessageAsRead,
} from "../services/messagesService";

import { useRealtimeCore } from "./useRealtimeCore";

type UseMessagesInput = {
  mode: "inbox" | "sent";
  onError?: (message: string) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function useMessages(input: UseMessagesInput) {
  const { mode, onError } = input;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const data =
          mode === "sent" ? await fetchSentMessages() : await fetchInboxMessages();

        setMessages(data);
      } catch (error) {
        onError?.(
          getErrorMessage(
            error,
            mode === "sent"
              ? "Der opstod en fejl under hentning af sendte beskeder."
              : "Der opstod en fejl under hentning af beskeder.",
          ),
        );

        setMessages([]);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [mode, onError],
  );

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useRealtimeCore({
    onMessage: () => loadMessages(false),
  });

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [messages]);

  const unreadCount = useMemo(() => {
    return messages.filter((message) => !message.isRead && !message.readAt)
      .length;
  }, [messages]);

  const markAsRead = useCallback(
    async (messageId: number) => {
      const previousMessages = messages;

      try {
        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : message,
          ),
        );

        await markMessageAsRead(messageId);
      } catch (error) {
        onError?.(
          getErrorMessage(
            error,
            "Der opstod en fejl under markering af besked som læst.",
          ),
        );

        setMessages(previousMessages);

        await loadMessages(false);
      }
    },
    [loadMessages, messages, onError],
  );

  const archive = useCallback(
    async (messageId: number) => {
      const previousMessages = messages;

      try {
        setMessages((current) =>
          current.filter((message) => message.id !== messageId),
        );

        await archiveMessage(messageId);
      } catch (error) {
        onError?.(
          getErrorMessage(
            error,
            "Der opstod en fejl under arkivering af besked.",
          ),
        );

        setMessages(previousMessages);

        await loadMessages(false);
      }
    },
    [loadMessages, messages, onError],
  );

  return {
    loading,

    messages,
    sortedMessages,
    unreadCount,

    loadMessages,

    markAsRead,
    archive,
  };
}
