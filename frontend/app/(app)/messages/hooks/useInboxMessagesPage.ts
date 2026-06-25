import { useCallback, useState } from "react";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useMessages } from "../../../hooks/useMessages";
import {
  getErrorMessage,
  type ErrorDialogState,
} from "../helpers/inboxMessageHelpers";

export function useInboxMessagesPage() {
  const confirmDialog = useConfirm();

  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null,
  );
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });

  const showErrorDialog = useCallback((title: string, description: string) => {
    setErrorDialog({
      open: true,
      title,
      description,
    });
  }, []);

  const closeErrorDialog = useCallback(() => {
    setErrorDialog({
      open: false,
      title: "",
      description: "",
    });
  }, []);

  const handleMessagesError = useCallback(
    (message: string) => {
      showErrorDialog("Kunne ikke hente beskeder", message);
    },
    [showErrorDialog],
  );

  const { loading, sortedMessages, markAsRead, archive } = useMessages({
    mode: "inbox",
    onError: handleMessagesError,
  });

  function handleOpenMessage(messageId: number, isExpanded: boolean) {
    const message = sortedMessages.find((current) => current.id === messageId);

    if (!isExpanded && message && !message.isRead) {
      markAsRead(messageId);
    }

    setExpandedMessageId(isExpanded ? null : messageId);
  }

  function handleArchive(messageId: number) {
    confirmDialog.confirm({
      title: "Arkiver besked",
      description:
        "Vil du arkivere denne besked? Du kan flytte den tilbage fra arkivet senere.",
      confirmText: "Arkiver",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          await archive(messageId);

          if (expandedMessageId === messageId) {
            setExpandedMessageId(null);
          }
        } catch (error) {
          showErrorDialog(
            "Beskeden kunne ikke arkiveres",
            getErrorMessage(
              error,
              "Der opstod en fejl, da beskeden skulle arkiveres. Prøv igen.",
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
    errorDialog,
    handleOpenMessage,
    handleArchive,
    closeErrorDialog,
  };
}
