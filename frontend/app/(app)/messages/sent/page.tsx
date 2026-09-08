"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import MessagesWorkspaceNav from "../components/layout/MessagesWorkspaceNav";
import SentMessageDetail from "./components/workspace/SentMessageDetail";
import SentMessagesWorkspaceList from "./components/workspace/SentMessagesWorkspaceList";
import {
  useSentMessagesPage,
} from "./hooks/page/useSentMessagesPage";

export default function SentMessagesPage() {
  const {
    loading,
    loadingMore,
    hasMore,
    sortedMessages,
    expandedMessageId,
    errorDialog,
    confirmDialog,
    loadMore,
    toggleMessage,
    handleArchive,
    closeErrorDialog,
  } =
    useSentMessagesPage();

  const selectedMessageId =
    expandedMessageId ??
    sortedMessages[0]?.id ??
    null;
  const selectedMessage =
    sortedMessages.find(
      (message) =>
        message.id ===
        selectedMessageId,
    ) ?? null;

  function handleSelect(
    messageId: number,
  ) {
    if (
      expandedMessageId ===
      messageId
    ) {
      return;
    }

    toggleMessage(
      messageId,
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-950 transition-colors dark:bg-[#030712] dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[190px_minmax(300px,410px)_minmax(0,1fr)]">
            <MessagesWorkspaceNav
              active="sent"
            />

            <section className="border-b border-slate-200 dark:border-slate-700/80 lg:border-b-0 lg:border-r">
              <header className="border-b border-slate-200 px-4 py-4 dark:border-slate-700/80">
                <h1 className="text-xl font-bold text-slate-950 dark:text-white">
                  Sendt
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {sortedMessages.length}{" "}
                  {sortedMessages.length ===
                  1
                    ? "besked"
                    : "beskeder"}
                </p>
              </header>

              <div className="max-h-[calc(100dvh-15rem)] overflow-y-auto">
                {loading && (
                  <div
                    className="p-5 text-sm text-slate-500 dark:text-slate-400"
                    role="status"
                  >
                    Henter sendte beskeder...
                  </div>
                )}

                {!loading &&
                  sortedMessages.length ===
                    0 && (
                    <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                      Du har ingen sendte beskeder.
                    </div>
                  )}

                {!loading &&
                  sortedMessages.length >
                    0 && (
                    <SentMessagesWorkspaceList
                      messages={
                        sortedMessages
                      }
                      selectedMessageId={
                        selectedMessageId
                      }
                      onSelect={
                        handleSelect
                      }
                    />
                  )}

                {hasMore && (
                  <div className="border-t border-slate-200 p-3 text-center dark:border-slate-700/80">
                    <button
                      type="button"
                      onClick={() =>
                        void loadMore()
                      }
                      disabled={
                        loadingMore
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {loadingMore
                        ? "Henter..."
                        : "Hent ældre sendte beskeder"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <SentMessageDetail
              message={
                selectedMessage
              }
              onDelete={
                handleArchive
              }
            />
          </div>
        </div>
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
        open={
          errorDialog.open
        }
        title={
          errorDialog.title
        }
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
