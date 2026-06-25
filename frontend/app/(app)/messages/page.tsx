"use client";

import { useCallback, useState } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useMessages } from "../../hooks/useMessages";
import InboxMessagesEmptyState from "./components/InboxMessagesEmptyState";
import InboxMessagesHeader from "./components/InboxMessagesHeader";
import InboxMessagesList from "./components/InboxMessagesList";
import {
  getErrorMessage,
  type ErrorDialogState,
} from "./helpers/inboxMessageHelpers";

export default function MessagesPage() {
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

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <InboxMessagesHeader />

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter beskeder...
          </div>
        )}

        {!loading && sortedMessages.length === 0 && <InboxMessagesEmptyState />}

        {!loading && sortedMessages.length > 0 && (
          <InboxMessagesList
            messages={sortedMessages}
            expandedMessageId={expandedMessageId}
            onOpenMessage={handleOpenMessage}
            onArchive={handleArchive}
          />
        )}
      </div>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />

      <InfoModal
        open={errorDialog.open}
        title={errorDialog.title}
        description={errorDialog.description}
        buttonText="OK"
        variant="error"
        onClose={() =>
          setErrorDialog({
            open: false,
            title: "",
            description: "",
          })
        }
      />
    </main>
  );
}
