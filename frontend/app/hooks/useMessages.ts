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
};

export function useMessages(input: UseMessagesInput) {
  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);

      const data =
        input.mode === "sent"
          ? await fetchSentMessages()
          : await fetchInboxMessages();

      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages", error);

      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [input.mode]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useRealtimeCore({
    onMessage: loadMessages,
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
        console.error(error);

        loadMessages();
      }
    },
    [loadMessages],
  );

  const archive = useCallback(
    async (messageId: number) => {
      try {
        setMessages((current) =>
          current.filter((message) => message.id !== messageId),
        );

        await archiveMessage(messageId);
      } catch (error) {
        console.error(error);

        loadMessages();
      }
    },
    [loadMessages],
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
