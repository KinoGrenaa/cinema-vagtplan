"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Message,
} from "../types/messages";
import {
  archiveMessage,
  fetchInboxMessagePage,
  fetchSentMessagePage,
  markMessageAsRead,
} from "../services/messagesService";
import {
  useRealtimeCore,
} from "./useRealtimeCore";

type UseMessagesInput = {
  mode:
    | "inbox"
    | "sent";
  targetMessageId?:
    number | null;
  onError?:
    (message: string) => void;
};

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim().length >
      0
  ) {
    return error.message;
  }

  return fallback;
}

function mergeMessages(
  current: Message[],
  incoming: Message[],
) {
  const byId =
    new Map<number, Message>();

  for (const message of [
    ...current,
    ...incoming,
  ]) {
    byId.set(
      message.id,
      message,
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) =>
      new Date(
        right.createdAt,
      ).getTime() -
      new Date(
        left.createdAt,
      ).getTime(),
  );
}

export function useMessages(
  input: UseMessagesInput,
) {
  const {
    mode,
    targetMessageId,
    onError,
  } = input;

  const [
    messages,
    setMessages,
  ] =
    useState<Message[]>([]);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);
  const [
    hasMore,
    setHasMore,
  ] = useState(false);
  const [
    nextBeforeId,
    setNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );

  const loadMessages =
    useCallback(
      async (
        showLoading = true,
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          if (mode === "sent") {
            const page =
              await fetchSentMessagePage();

            setMessages(
              page.items,
            );
            setHasMore(
              page.hasMore,
            );
            setNextBeforeId(
              page.nextBeforeId,
            );
            return;
          }

          const page =
            await fetchInboxMessagePage({
              targetId:
                targetMessageId,
            });
          const initialMessages =
            page.target
              ? mergeMessages(
                  page.items,
                  [
                    page.target,
                  ],
                )
              : page.items;

          setMessages(
            initialMessages,
          );
          setHasMore(
            page.hasMore,
          );
          setNextBeforeId(
            page.nextBeforeId,
          );
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
          setHasMore(false);
          setNextBeforeId(
            null,
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        mode,
        onError,
        targetMessageId,
      ],
    );

  const loadMore =
    useCallback(async () => {
      if (
        !hasMore ||
        !nextBeforeId ||
        loadingMore
      ) {
        return;
      }

      try {
        setLoadingMore(true);

        const page =
          mode === "sent"
            ? await fetchSentMessagePage({
                beforeId:
                  nextBeforeId,
              })
            : await fetchInboxMessagePage({
                beforeId:
                  nextBeforeId,
              });

        setMessages(
          (current) =>
            mergeMessages(
              current,
              page.items,
            ),
        );
        setHasMore(
          page.hasMore,
        );
        setNextBeforeId(
          page.nextBeforeId,
        );
      } catch (error) {
        onError?.(
          getErrorMessage(
            error,
            mode === "sent"
              ? "Ældre sendte beskeder kunne ikke hentes."
              : "Ældre beskeder kunne ikke hentes.",
          ),
        );
      } finally {
        setLoadingMore(false);
      }
    }, [
      hasMore,
      loadingMore,
      mode,
      nextBeforeId,
      onError,
    ]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useRealtimeCore({
    onMessage: () =>
      void loadMessages(
        false,
      ),
  });

  const sortedMessages =
    useMemo(() => {
      return [
        ...messages,
      ].sort(
        (left, right) =>
          new Date(
            right.createdAt,
          ).getTime() -
          new Date(
            left.createdAt,
          ).getTime(),
      );
    }, [messages]);

  const unreadCount =
    useMemo(() => {
      return messages.filter(
        (message) =>
          !message.isRead &&
          !message.readAt,
      ).length;
    }, [messages]);

  const markAsRead =
    useCallback(
      async (
        messageId: number,
      ) => {
        const previousMessages =
          messages;

        try {
          setMessages(
            (current) =>
              current.map(
                (message) =>
                  message.id ===
                  messageId
                    ? {
                        ...message,
                        isRead: true,
                        readAt:
                          new Date().toISOString(),
                      }
                    : message,
              ),
          );

          await markMessageAsRead(
            messageId,
          );
        } catch (error) {
          onError?.(
            getErrorMessage(
              error,
              "Der opstod en fejl under markering af besked som læst.",
            ),
          );

          setMessages(
            previousMessages,
          );

          await loadMessages(
            false,
          );
        }
      },
      [
        loadMessages,
        messages,
        onError,
      ],
    );

  const archive =
    useCallback(
      async (
        messageId: number,
      ) => {
        const previousMessages =
          messages;

        try {
          setMessages(
            (current) =>
              current.filter(
                (message) =>
                  message.id !==
                  messageId,
              ),
          );

          await archiveMessage(
            messageId,
          );
        } catch (error) {
          onError?.(
            getErrorMessage(
              error,
              "Der opstod en fejl under arkivering af besked.",
            ),
          );

          setMessages(
            previousMessages,
          );

          await loadMessages(
            false,
          );
        }
      },
      [
        loadMessages,
        messages,
        onError,
      ],
    );

  return {
    loading,
    loadingMore,
    hasMore,
    messages,
    sortedMessages,
    unreadCount,
    loadMessages,
    loadMore,
    markAsRead,
    archive,
  };
}
