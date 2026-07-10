"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";

import InfoModal from "@/app/components/modals/InfoModal";

import InboxMessagesEmptyState from "./components/list/InboxMessagesEmptyState";

import InboxMessagesHeader from "./components/layout/InboxMessagesHeader";

import InboxMessagesList from "./components/list/InboxMessagesList";

import { useInboxMessagesPage } from "./hooks/useInboxMessagesPage";

export default function MessagesPage() {
  const {
    confirmDialog,
    loading,
    sortedMessages,
    expandedMessageId,
    errorDialog,
    handleOpenMessage,
    handleArchive,
    closeErrorDialog,
  } = useInboxMessagesPage();

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
        onClose={closeErrorDialog}
      />
    </main>
  );
}
