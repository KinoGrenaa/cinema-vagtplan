"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useConfirm,
} from "@/app/hooks/useConfirm";

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
    expandedMessageId,
    setExpandedMessageId,
  ] = useState<
    number | null
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
  const focusedMessageRef =
    useRef<number | null>(null);

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
    sortedMessages,
    markAsRead,
    archive,
  } = useMessages({
    mode: "inbox",
    onError:
      handleMessagesError,
  });

  const targetState:
    InboxMessageTargetState =
      messageTarget.invalid
        ? "invalid"
        : !messageTarget.messageId
          ? "idle"
          : loading
            ? "loading"
            : sortedMessages.some(
                  (message) =>
                    message.id ===
                    messageTarget.messageId,
                )
              ? "found"
              : "missing";

  useEffect(() => {
    const messageId =
      messageTarget.messageId;

    if (
      !messageId ||
      loading
    ) {
      return;
    }

    const message =
      sortedMessages.find(
        (current) =>
          current.id ===
          messageId,
      );

    if (!message) {
      focusedMessageRef.current =
        null;
      return;
    }

    setExpandedMessageId(
      messageId,
    );

    if (!message.isRead) {
      void markAsRead(
        messageId,
      );
    }

    if (
      focusedMessageRef.current ===
      messageId
    ) {
      return;
    }

    focusedMessageRef.current =
      messageId;

    const timeoutId =
      window.setTimeout(() => {
        const element =
          document.getElementById(
            `inbox-message-${messageId}`,
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

      focusedMessageRef.current =
        null;
    }, [
      pathname,
      router,
      searchParams,
    ]);

  function handleOpenMessage(
    messageId: number,
    isExpanded: boolean,
  ) {
    const message =
      sortedMessages.find(
        (current) =>
          current.id ===
          messageId,
      );

    if (
      !isExpanded &&
      message &&
      !message.isRead
    ) {
      void markAsRead(
        messageId,
      );
    }

    setExpandedMessageId(
      isExpanded
        ? null
        : messageId,
    );
  }

  function handleArchive(
    messageId: number,
  ) {
    confirmDialog.confirm({
      title: "Arkiver besked",
      description:
        "Vil du arkivere denne besked? Du kan flytte den tilbage fra arkivet senere.",
      confirmText: "Arkiver",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          await archive(
            messageId,
          );

          if (
            expandedMessageId ===
            messageId
          ) {
            setExpandedMessageId(
              null,
            );
          }

          if (
            messageTarget.messageId ===
            messageId
          ) {
            clearMessageTarget();
          }
        } catch (error) {
          showErrorDialog(
            "Beskeden kunne ikke arkiveres",
            getErrorMessage(
              error,
              "Der opstod en fejl, da beskeden skulle arkiveres.\nPrøv igen.",
            ),
          );
        }
      },
    });
  }

  return {
    confirmDialog,
    loading,
    sortedMessages,
    expandedMessageId,
    focusedMessageId:
      messageTarget.messageId,
    targetState,
    errorDialog,
    handleOpenMessage,
    handleArchive,
    clearMessageTarget,
    closeErrorDialog,
  };
}
