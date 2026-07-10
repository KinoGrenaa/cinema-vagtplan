"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";

import InfoModal from "@/app/components/modals/InfoModal";

import SentMessagesEmptyState from "./components/list/SentMessagesEmptyState";

import SentMessagesHeader from "./components/layout/SentMessagesHeader";

import SentMessagesList from "./components/list/SentMessagesList";

import { useSentMessagesPage } from "./hooks/page/useSentMessagesPage";

export default function SentMessagesPage() {
  const {
    loading,
    sortedMessages,
    groupedMessages,
    expandedDateKeys,
    expandedMessageId,
    errorDialog,
    confirmDialog,
    toggleDateGroup,
    toggleMessage,
    handleArchive,
    closeErrorDialog,
  } = useSentMessagesPage();

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
        onClose={closeErrorDialog}
      />
    </main>
  );
}
