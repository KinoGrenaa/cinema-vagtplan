"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

import ArchivedMessagesHeader from "./components/ArchivedMessagesHeader";
import ArchivedMessagesListSection from "./components/ArchivedMessagesListSection";
import {
  getArchiveSectionLabel,
  getMessageArchiveSection,
  getRestoreTargetLabel,
  groupMessagesBySentDate,
  readErrorMessage,
} from "./helpers/archiveMessageHelpers";
import type { ArchiveSection, Message } from "./helpers/archiveMessageTypes";

export default function ArchivedMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const confirmDialog = useConfirm();

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSection, setActiveSection] =
    useState<ArchiveSection>("received");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [restoringMessageId, setRestoringMessageId] = useState<number | null>(
    null,
  );
  const errorDialog = useInfoModal();

  const fetchMessages = useCallback(
    async (showLoading = true) => {
      if (!user) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }

        const response = await apiFetch("/messages/archive");

        if (!response.ok) {
          errorDialog.showError(
            "Kunne ikke hente arkiverede beskeder",
            await readErrorMessage(
              response,
              "Der opstod en fejl under hentning af arkiverede beskeder.",
            ),
          );

          setMessages([]);
          return;
        }

        const data = await response.json();

        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        errorDialog.showError(
          "Kunne ikke hente arkiverede beskeder",
          error instanceof Error
            ? error.message
            : "Der opstod en uventet fejl under hentning af arkiverede beskeder.",
        );

        setMessages([]);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [user],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchMessages();
  }, [authLoading, fetchMessages, user]);

  const refreshMessagesSilently = useCallback(() => {
    fetchMessages(false);
  }, [fetchMessages]);

  useRealtimeCore({
    onMessage: refreshMessagesSilently,
  });

  const receivedMessages = useMemo(() => {
    return messages.filter(
      (message) => getMessageArchiveSection(message, user?.id) === "received",
    );
  }, [messages, user?.id]);

  const sentMessages = useMemo(() => {
    return messages.filter(
      (message) => getMessageArchiveSection(message, user?.id) === "sent",
    );
  }, [messages, user?.id]);

  const activeMessages =
    activeSection === "sent" ? sentMessages : receivedMessages;

  const groupedMessages = useMemo(() => {
    return groupMessagesBySentDate(activeMessages);
  }, [activeMessages]);

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

  function switchSection(section: ArchiveSection) {
    setActiveSection(section);
    setExpandedMessageId(null);
    setExpandedDateKeys([]);
  }

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  function toggleMessage(messageId: number) {
    setExpandedMessageId((currentId) =>
      currentId === messageId ? null : messageId,
    );
  }

  async function restoreMessage(messageId: number, section: ArchiveSection) {
    try {
      setRestoringMessageId(messageId);

      const response = await apiFetch(`/messages/${messageId}/unarchive`, {
        method: "PATCH",
      });

      if (!response.ok) {
        errorDialog.showError(
          "Kunne ikke flytte beskeden tilbage",
          await readErrorMessage(
            response,
            `Der opstod en fejl under flytning af beskeden tilbage til ${getRestoreTargetLabel(
              section,
            )}.`,
          ),
        );

        return;
      }

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== messageId),
      );
      setExpandedMessageId((currentId) =>
        currentId === messageId ? null : currentId,
      );
    } catch (error) {
      errorDialog.showError(
        "Kunne ikke flytte beskeden tilbage",
        error instanceof Error
          ? error.message
          : `Der opstod en uventet fejl under flytning af beskeden tilbage til ${getRestoreTargetLabel(
              section,
            )}.`,
      );
    } finally {
      setRestoringMessageId(null);
    }
  }

  function confirmRestoreMessage(message: Message, section: ArchiveSection) {
    const targetLabel = getRestoreTargetLabel(section);

    confirmDialog.confirm({
      title: "Flyt besked tilbage",
      description: `Vil du flytte "${message.subject}" tilbage til ${targetLabel}?`,
      confirmText: "Flyt tilbage",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        await restoreMessage(message.id, section);
      },
    });
  }

  const pageLoading = authLoading || loading;
  const messageCount = messages.length;
  const activeCount = activeMessages.length;
  const activeSectionLabel = getArchiveSectionLabel(activeSection);
  const emptyText =
    activeSection === "sent"
      ? "Du har ingen sendte arkiverede beskeder."
      : "Du har ingen modtagne arkiverede beskeder.";

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <ArchivedMessagesHeader />

        <ArchivedMessagesListSection
          pageLoading={pageLoading}
          messageCount={messageCount}
          activeSection={activeSection}
          receivedCount={receivedMessages.length}
          sentCount={sentMessages.length}
          activeCount={activeCount}
          activeSectionLabel={activeSectionLabel}
          emptyText={emptyText}
          groupedMessages={groupedMessages}
          expandedDateKeys={expandedDateKeys}
          expandedMessageId={expandedMessageId}
          restoringMessageId={restoringMessageId}
          onSwitchSection={switchSection}
          onToggleDateGroup={toggleDateGroup}
          onToggleMessage={toggleMessage}
          onConfirmRestoreMessage={confirmRestoreMessage}
        />

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
          buttonText={errorDialog.buttonText}
          variant={errorDialog.variant}
          onClose={errorDialog.close}
        />
      </div>
    </main>
  );
}
