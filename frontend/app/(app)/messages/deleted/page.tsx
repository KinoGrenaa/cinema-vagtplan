"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import {
  useConfirm,
} from "@/app/hooks/useConfirm";
import {
  useInfoModal,
} from "@/app/hooks/useInfoModal";

import MessagesWorkspaceNav from "../components/layout/MessagesWorkspaceNav";
import DeletedMessageDetail from "../archive/components/workspace/DeletedMessageDetail";
import DeletedMessagesWorkspaceList from "../archive/components/workspace/DeletedMessagesWorkspaceList";
import {
  useArchivedMessages,
} from "../archive/hooks/page/useArchivedMessages";

export default function DeletedMessagesPage() {
  const confirmDialog =
    useConfirm();
  const errorDialog =
    useInfoModal();

  const {
    pageLoading,
    loadingMore,
    hasMore,
    activeSection,
    receivedCount,
    sentCount,
    activeTotalCount,
    groupedMessages,
    expandedMessageId,
    restoringMessageId,
    loadMore,
    switchSection,
    toggleMessage,
    confirmRestoreMessage,
  } =
    useArchivedMessages({
      confirmDialog,
      errorDialog,
    });

  const messages =
    groupedMessages.flatMap(
      (group) =>
        group.messages,
    );
  const selectedMessageId =
    expandedMessageId ??
    messages[0]?.id ??
    null;
  const selectedMessage =
    messages.find(
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
              active="deleted"
            />

            <section className="border-b border-slate-200 dark:border-slate-700/80 lg:border-b-0 lg:border-r">
              <header className="border-b border-slate-200 p-3 dark:border-slate-700/80">
                <h1 className="px-1 text-xl font-bold text-slate-950 dark:text-white">
                  Slettet
                </h1>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      switchSection(
                        "received",
                      )
                    }
                    aria-pressed={
                      activeSection ===
                      "received"
                    }
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeSection ===
                      "received"
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Modtagne{" "}
                    <span className="ml-1">
                      {receivedCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      switchSection(
                        "sent",
                      )
                    }
                    aria-pressed={
                      activeSection ===
                      "sent"
                    }
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeSection ===
                      "sent"
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Sendte{" "}
                    <span className="ml-1">
                      {sentCount}
                    </span>
                  </button>
                </div>

                <p className="mt-3 px-1 text-xs text-slate-500 dark:text-slate-400">
                  {activeTotalCount}{" "}
                  {activeSection ===
                  "received"
                    ? activeTotalCount ===
                      1
                      ? "samtale"
                      : "samtaler"
                    : activeTotalCount ===
                        1
                      ? "besked"
                      : "beskeder"}
                </p>
              </header>

              <div className="max-h-[calc(100dvh-19rem)] overflow-y-auto">
                {pageLoading && (
                  <div
                    className="p-5 text-sm text-slate-500 dark:text-slate-400"
                    role="status"
                  >
                    Henter Slettet...
                  </div>
                )}

                {!pageLoading &&
                  messages.length ===
                    0 && (
                    <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                      {activeSection ===
                      "received"
                        ? "Du har ingen modtagne slettede samtaler."
                        : "Du har ingen sendte slettede beskeder."}
                    </div>
                  )}

                {!pageLoading &&
                  messages.length >
                    0 && (
                    <DeletedMessagesWorkspaceList
                      messages={
                        messages
                      }
                      activeSection={
                        activeSection
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
                        : activeSection ===
                            "received"
                          ? "Hent ældre samtaler"
                          : "Hent ældre beskeder"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <DeletedMessageDetail
              message={
                selectedMessage
              }
              activeSection={
                activeSection
              }
              restoring={
                restoringMessageId ===
                selectedMessage?.id
              }
              onRestore={
                confirmRestoreMessage
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
        buttonText={
          errorDialog.buttonText
        }
        variant={
          errorDialog.variant
        }
        onClose={
          errorDialog.close
        }
      />
    </main>
  );
}
