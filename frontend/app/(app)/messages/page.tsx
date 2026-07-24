"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import InboxMessagesEmptyState from "./components/list/InboxMessagesEmptyState";
import InboxMessagesList from "./components/list/InboxMessagesList";
import InboxMessagesHeader from "./components/layout/InboxMessagesHeader";
import InboxMessageTargetNotice from "./components/layout/InboxMessageTargetNotice";
import {
  useInboxMessagesPage,
} from "./hooks/page/useInboxMessagesPage";

export default function MessagesPage() {
  const {
    confirmDialog,
    loading,
    sortedMessages,
    expandedMessageId,
    focusedMessageId,
    targetState,
    errorDialog,
    handleOpenMessage,
    handleArchive,
    clearMessageTarget,
    closeErrorDialog,
  } = useInboxMessagesPage();

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 transition-colors dark:bg-[#030712] dark:text-slate-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <InboxMessagesHeader />

        <InboxMessageTargetNotice
          state={targetState}
          messageId={
            focusedMessageId
          }
          onClear={
            clearMessageTarget
          }
        />

        {loading && (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300"
            role="status"
            aria-live="polite"
          >
            Henter beskeder...
          </div>
        )}

        {!loading &&
          sortedMessages.length ===
            0 && (
            <InboxMessagesEmptyState />
          )}

        {!loading &&
          sortedMessages.length >
            0 && (
            <InboxMessagesList
              messages={
                sortedMessages
              }
              expandedMessageId={
                expandedMessageId
              }
              focusedMessageId={
                focusedMessageId
              }
              onOpenMessage={
                handleOpenMessage
              }
              onArchive={
                handleArchive
              }
            />
          )}
      </div>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={
          confirmDialog.description
        }
        confirmText={
          confirmDialog.confirmText
        }
        cancelText={
          confirmDialog.cancelText
        }
        confirmVariant={
          confirmDialog.confirmVariant
        }
        loading={
          confirmDialog.loading
        }
        onConfirm={
          confirmDialog.handleConfirm
        }
        onCancel={
          confirmDialog.handleCancel
        }
      />

      <InfoModal
        open={errorDialog.open}
        title={errorDialog.title}
        description={
          errorDialog.description
        }
        buttonText="OK"
        variant="error"
        onClose={
          closeErrorDialog
        }
      />
    </main>
  );
}
