"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { toast } from "sonner";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useConfirm,
} from "@/app/hooks/useConfirm";
import {
  fetchMessageConversation,
} from "@/app/services/messagesService";
import type {
  MessageConversation,
} from "@/app/types/messages";
import {
  useMessages,
} from "../../../../hooks/useMessages";
import {
  getErrorMessage,
  type ErrorDialogState,
} from "../../helpers/core/inboxMessageHelpers";
import {
  parseInboxMessageTarget,
  type InboxMessageTargetState,
} from "../../helpers/core/inboxMessageTarget";

export function useInboxMessagesPage() {
  const confirmDialog =
    useConfirm();
  const pathname =
    usePathname();
  const router =
    useRouter();
  const searchParams =
    useSearchParams();
  const [
    expandedConversationId,
    setExpandedConversationId,
  ] = useState<
    string | null
  >(null);
  const [
    conversationsById,
    setConversationsById,
  ] = useState<
    Record<
      string,
      MessageConversation
    >
  >({});
  const [
    conversationLoadingId,
    setConversationLoadingId,
  ] = useState<
    string | null
  >(null);
  const [
    errorDialog,
    setErrorDialog,
  ] =
    useState<ErrorDialogState>({
      open: false,
      title: "",
      description: "",
    });
  const focusedConversationRef =
    useRef<string | null>(
      null,
    );
  const messageTarget =
    parseInboxMessageTarget(
      searchParams.get(
        "messageId",
      ),
    );

  const showErrorDialog =
    useCallback(
      (
        title: string,
        description: string,
      ) => {
        setErrorDialog({
          open: true,
          title,
          description,
        });
      },
      [],
    );
  const closeErrorDialog =
    useCallback(() => {
      setErrorDialog({
        open: false,
        title: "",
        description: "",
      });
    }, []);

  const handleMessagesError =
    useCallback(
      (message: string) => {
        showErrorDialog(
          "Kunne ikke hente beskeder",
          message,
        );
      },
      [showErrorDialog],
    );
  const {
    loading,
    loadingMore,
    hasMore,
    sortedMessages,
    targetConversationId,
    loadMore,
    markAsRead,
    archive,
  } = useMessages({
    mode: "inbox",
    targetMessageId:
      messageTarget.messageId,
    onError:
      handleMessagesError,
  });

  const loadConversation =
    useCallback(
      async (
        messageId: number,
        conversationId: string,
      ) => {
        setConversationLoadingId(
          conversationId,
        );

        try {
          const conversation =
            await fetchMessageConversation(
              messageId,
            );

          setConversationsById(
            (current) => ({
              ...current,
              [conversationId]:
                conversation,
            }),
          );
        } catch (error) {
          showErrorDialog(
            "Samtalen kunne ikke hentes",
            getErrorMessage(
              error,
              "Der opstod en fejl, da samtalen skulle hentes.\nPrøv igen.",
            ),
          );
        } finally {
          setConversationLoadingId(
            (current) =>
              current ===
              conversationId
                ? null
                : current,
          );
        }
      },
      [showErrorDialog],
    );

  const targetState:
    InboxMessageTargetState =
      messageTarget.invalid
        ? "invalid"
        : !messageTarget.messageId
          ? "idle"
          : loading
            ? "loading"
            : targetConversationId &&
                sortedMessages.some(
                  (message) =>
                    message.conversationId ===
                    targetConversationId,
                )
              ? "found"
              : "missing";

  useEffect(() => {
    const messageId =
      messageTarget.messageId;
    const conversationId =
      targetConversationId;

    if (
      !messageId ||
      !conversationId ||
      loading
    ) {
      return;
    }

    const message =
      sortedMessages.find(
        (current) =>
          current.conversationId ===
          conversationId,
      );

    if (!message) {
      focusedConversationRef.current =
        null;
      return;
    }

    setExpandedConversationId(
      conversationId,
    );

    if (!message.isRead) {
      void markAsRead(
        message.id,
      );
    }

    if (
      focusedConversationRef.current ===
      conversationId
    ) {
      return;
    }

    focusedConversationRef.current =
      conversationId;

    const timeoutId =
      window.setTimeout(() => {
        const element =
          document.getElementById(
            `inbox-conversation-${conversationId}`,
          );

        if (!element) {
          return;
        }

        element.focus({
          preventScroll: true,
        });

        const reduceMotion =
          window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;

        element.scrollIntoView({
          behavior: reduceMotion
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 100);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    loading,
    markAsRead,
    messageTarget.messageId,
    sortedMessages,
    targetConversationId,
  ]);

  useEffect(() => {
    if (!expandedConversationId) {
      return;
    }

    const representative =
      sortedMessages.find(
        (message) =>
          message.conversationId ===
          expandedConversationId,
      );

    if (!representative) {
      setExpandedConversationId(
        null,
      );
      return;
    }

    void loadConversation(
      representative.id,
      expandedConversationId,
    );
  }, [
    expandedConversationId,
    loadConversation,
    sortedMessages,
  ]);

  useEffect(() => {
    if (
      loading ||
      expandedConversationId ||
      targetConversationId ||
      sortedMessages.length ===
        0
    ) {
      return;
    }

    const first =
      sortedMessages[0];
    const conversationId =
      first.conversationId;

    if (!conversationId) {
      return;
    }

    setExpandedConversationId(
      conversationId,
    );

    if (!first.isRead) {
      void markAsRead(
        first.id,
      );
    }
  }, [
    expandedConversationId,
    loading,
    markAsRead,
    sortedMessages,
    targetConversationId,
  ]);

  const clearMessageTarget =
    useCallback(() => {
      const params =
        new URLSearchParams(
          searchParams.toString(),
        );

      params.delete(
        "messageId",
      );

      const query =
        params.toString();

      router.replace(
        query
          ? `${pathname}?${query}`
          : pathname,
        {
          scroll: false,
        },
      );

      focusedConversationRef.current =
        null;
    }, [
      pathname,
      router,
      searchParams,
    ]);

  function handleOpenMessage(
    messageId: number,
  ) {
    const message =
      sortedMessages.find(
        (current) =>
          current.id ===
          messageId,
      );
    const conversationId =
      message?.conversationId;

    if (!conversationId) {
      return;
    }

    if (!message.isRead) {
      void markAsRead(
        messageId,
      );
    }

    setExpandedConversationId(
      conversationId,
    );
  }

  function handleReply(
    messageId: number,
    mode:
      | "REPLY"
      | "REPLY_ALL",
  ) {
    window.location.href =
      `/messages/new?replyTo=${messageId}&replyMode=${mode}`;
  }

  function handleArchive(
    messageId: number,
  ) {
    const message =
      sortedMessages.find(
        (current) =>
          current.id ===
          messageId,
      );
    const conversationId =
      message?.conversationId;

    if (!conversationId) {
      return;
    }

    confirmDialog.confirm({
      title: "Slet samtale",
      description:
        "Vil du slette hele samtalen? Du kan flytte den tilbage fra Slettet senere.",
      confirmText: "Slet",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await archive(
            messageId,
          );

          if (
            expandedConversationId ===
            conversationId
          ) {
            setExpandedConversationId(
              null,
            );
          }

          setConversationsById(
            (current) => {
              const next = {
                ...current,
              };
              delete next[
                conversationId
              ];
              return next;
            },
          );

          if (
            targetConversationId ===
            conversationId
          ) {
            clearMessageTarget();
          }

          toast.success(
            "Samtalen er slettet.",
          );
        } catch (error) {
          showErrorDialog(
            "Samtalen kunne ikke slettes",
            getErrorMessage(
              error,
              "Der opstod en fejl, da samtalen skulle slettes.\nPrøv igen.",
            ),
          );
        }
      },
    });
  }

  return {
    confirmDialog,
    loading,
    loadingMore,
    hasMore,
    sortedMessages,
    expandedConversationId,
    focusedMessageId:
      messageTarget.messageId,
    focusedConversationId:
      targetConversationId,
    conversationsById,
    conversationLoadingId,
    targetState,
    errorDialog,
    loadMore,
    handleOpenMessage,
    handleReply,
    handleArchive,
    clearMessageTarget,
    closeErrorDialog,
  };
}
