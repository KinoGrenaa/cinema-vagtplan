"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useAuth } from "@/app/providers/AuthProvider";

import InboxConversationDetail from "./components/detail/InboxConversationDetail";
import InboxMessagesList from "./components/list/InboxMessagesList";
import InboxMessageTargetNotice from "./components/layout/InboxMessageTargetNotice";
import MessagesWorkspaceNav from "./components/layout/MessagesWorkspaceNav";
import { useInboxMessagesPage } from "./hooks/page/useInboxMessagesPage";

function canUserSendBroadcast(
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const user =
    value as {
      role?: string;
      canSendBroadcastMessages?: boolean;
    };

  return (
    user.role ===
      "ADMIN" ||
    user.role ===
      "MASTER" ||
    user.canSendBroadcastMessages ===
      true
  );
}

export default function MessagesPage() {
  const { user } =
    useAuth();

  const {
    confirmDialog,
    loading,
    loadingMore,
    hasMore,
    sortedMessages,
    expandedConversationId,
    focusedMessageId,
    focusedConversationId,
    conversationsById,
    conversationLoadingId,
    targetState,
    errorDialog,
    loadMore,
    handleOpenMessage,
    handleReply,
    handleArchive,
    clearMessageTarget,
    closeErrorDialog,
  } =
    useInboxMessagesPage();

  const selectedMessage =
    sortedMessages.find(
      (message) =>
        message.conversationId ===
        expandedConversationId,
    ) ?? null;

  const selectedConversation =
    expandedConversationId
      ? conversationsById[
          expandedConversationId
        ] ?? null
      : null;

  const unreadCount =
    sortedMessages.reduce(
      (
        total,
        message,
      ) =>
        total +
        (message
          .conversationUnreadCount ??
          (message.isRead
            ? 0
            : 1)),
      0,
    );

  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-950 transition-colors dark:bg-[#030712] dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-3">
        <InboxMessageTargetNotice
          state={targetState}
          messageId={
            focusedMessageId
          }
          onClear={
            clearMessageTarget
          }
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[190px_minmax(300px,410px)_minmax(0,1fr)]">
            <MessagesWorkspaceNav
              active="inbox"
              unreadCount={
                unreadCount
              }
            />

            <section className="border-b border-slate-200 dark:border-slate-700/80 lg:border-b-0 lg:border-r">
              <header className="border-b border-slate-200 px-4 py-4 dark:border-slate-700/80">
                <h1 className="text-xl font-bold text-slate-950 dark:text-white">
                  Indbakke
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {sortedMessages.length}{" "}
                  {sortedMessages.length ===
                  1
                    ? "samtale"
                    : "samtaler"}
                </p>
              </header>

              <div className="max-h-[calc(100dvh-15rem)] overflow-y-auto">
                {loading && (
                  <div
                    className="p-5 text-sm text-slate-500 dark:text-slate-400"
                    role="status"
                    aria-live="polite"
                  >
                    Henter samtaler...
                  </div>
                )}

                {!loading &&
                  sortedMessages.length ===
                    0 && (
                    <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                      Din indbakke er tom.
                    </div>
                  )}

                {!loading &&
                  sortedMessages.length >
                    0 && (
                    <InboxMessagesList
                      messages={
                        sortedMessages
                      }
                      selectedConversationId={
                        expandedConversationId
                      }
                      focusedConversationId={
                        focusedConversationId
                      }
                      onOpenMessage={
                        handleOpenMessage
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
                        : "Hent ældre samtaler"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <InboxConversationDetail
              message={
                selectedMessage
              }
              conversation={
                selectedConversation
              }
              loading={
                Boolean(
                  expandedConversationId &&
                    conversationLoadingId ===
                      expandedConversationId,
                )
              }
              canSendBroadcastMessages={canUserSendBroadcast(
                user,
              )}
              onReply={
                handleReply
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
