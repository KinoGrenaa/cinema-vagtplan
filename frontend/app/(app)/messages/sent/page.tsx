"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import SentMessagesEmptyState from "./components/list/SentMessagesEmptyState";
import SentMessagesList from "./components/list/SentMessagesList";
import SentMessagesHeader from "./components/layout/SentMessagesHeader";
import {
  useSentMessagesPage,
} from "./hooks/page/useSentMessagesPage";

export default function SentMessagesPage() {
  const {
    loading,
    loadingMore,
    hasMore,
    sortedMessages,
    groupedMessages,
    expandedDateKeys,
    expandedMessageId,
    errorDialog,
    confirmDialog,
    loadMore,
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

        {!loading &&
          sortedMessages.length ===
            0 && (
            <SentMessagesEmptyState />
          )}

        {!loading &&
          sortedMessages.length >
            0 && (
            <>
              <SentMessagesList
                sortedMessages={
                  sortedMessages
                }
                groupedMessages={
                  groupedMessages
                }
                expandedDateKeys={
                  expandedDateKeys
                }
                expandedMessageId={
                  expandedMessageId
                }
                onToggleDateGroup={
                  toggleDateGroup
                }
                onToggleMessage={
                  toggleMessage
                }
                onArchive={
                  handleArchive
                }
              />

              {hasMore && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() =>
                      void loadMore()
                    }
                    disabled={
                      loadingMore
                    }
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                  >
                    {loadingMore
                      ? "Henter..."
                      : "Hent ældre sendte beskeder"}
                  </button>
                </div>
              )}
            </>
          )}
      </div>

      <ConfirmModal
        open={
          confirmDialog.open
        }
        title={
          confirmDialog.title
        }
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
