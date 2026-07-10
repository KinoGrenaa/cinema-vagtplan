"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";

import InfoModal from "@/app/components/modals/InfoModal";

import { useConfirm } from "@/app/hooks/useConfirm";

import { useInfoModal } from "@/app/hooks/useInfoModal";

import ArchivedMessagesHeader from "./components/layout/ArchivedMessagesHeader";

import ArchivedMessagesListSection from "./components/list/ArchivedMessagesListSection";
import { useArchivedMessages } from "./hooks/page/useArchivedMessages";

export default function ArchivedMessagesPage() {
  const confirmDialog = useConfirm();

  const errorDialog = useInfoModal();

  const {
    pageLoading,
    messageCount,
    activeSection,
    receivedCount,
    sentCount,
    activeCount,
    activeSectionLabel,
    emptyText,
    groupedMessages,
    expandedDateKeys,
    expandedMessageId,
    restoringMessageId,
    switchSection,
    toggleDateGroup,
    toggleMessage,
    confirmRestoreMessage,
  } = useArchivedMessages({ confirmDialog, errorDialog });

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <ArchivedMessagesHeader />

        <ArchivedMessagesListSection
          pageLoading={pageLoading}
          messageCount={messageCount}
          activeSection={activeSection}
          receivedCount={receivedCount}
          sentCount={sentCount}
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
