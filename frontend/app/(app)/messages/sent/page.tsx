"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useMessages } from "../../../hooks/useMessages";
import SentMessagesEmptyState from "./components/SentMessagesEmptyState";
import SentMessagesHeader from "./components/SentMessagesHeader";
import SentMessagesList from "./components/SentMessagesList";
import {
  getErrorMessage,
  groupMessagesBySentDate,
} from "./helpers/sentMessageHelpers";

type ErrorDialogState = {
  open: boolean;
  title: string;
  description: string;
};

export default function SentMessagesPage() {
  const confirmDialog = useConfirm();
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
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
      showErrorDialog("Kunne ikke hente sendte beskeder", message);
    },
    [showErrorDialog],
  );

  const { loading, sortedMessages, archive } = useMessages({
    mode: "sent",
    onError: handleMessagesError,
  });

  const groupedMessages = useMemo(() => {
    return groupMessagesBySentDate(sortedMessages);
  }, [sortedMessages]);

  useEffect(() => {
    setExpandedDateKeys((current) => {
      const validKeys = groupedMessages.map((group) => group.dateKey);

      if (validKeys.length === 0) {
        return [];
      }

      const currentValidKeys = current.filter((dateKey) =>
        validKeys.includes(dateKey),
      );
      const latestDateKey = validKeys[0];
      const nextKeys = currentValidKeys.includes(latestDateKey)
        ? currentValidKeys
        : [latestDateKey, ...currentValidKeys];

      const isUnchanged =
        nextKeys.length === current.length &&
        nextKeys.every((dateKey, index) => dateKey === current[index]);

      return isUnchanged ? current : nextKeys;
    });
  }, [groupedMessages]);

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  function toggleMessage(messageId: number) {
    setExpandedMessageId((current) =>
      current === messageId ? null : messageId,
    );
  }

  function handleArchive(messageId: number) {
    confirmDialog.confirm({
      title: "Arkiver besked",
      description: "Vil du arkivere denne besked?",
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
        <SentMessagesHeader />

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter sendte beskeder...
          </div>
        )}

        {!loading && sortedMessages.length === 0 && <SentMessagesEmptyState />}

        {!loading && sortedMessages.length > 0 && (
          <SentMessagesList
            sortedMessages={sortedMessages}
            groupedMessages={groupedMessages}
            expandedDateKeys={expandedDateKeys}
            expandedMessageId={expandedMessageId}
            onToggleDateGroup={toggleDateGroup}
            onToggleMessage={toggleMessage}
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
