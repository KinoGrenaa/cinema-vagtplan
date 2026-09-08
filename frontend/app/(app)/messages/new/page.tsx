"use client";

import InfoModal from "@/app/components/modals/InfoModal";

import MessagesWorkspaceNav from "../components/layout/MessagesWorkspaceNav";
import SendMessageForm from "../send/components/form/SendMessageForm";
import MessageConversationContext from "../send/components/layout/MessageConversationContext";
import {
  useSendMessagePage,
} from "../send/hooks/page/useSendMessagePage";

export default function NewMessagePage() {
  const {
    authLoading,
    users,
    selectedRecipientIds,
    isBroadcast,
    canSendBroadcastMessages,
    replyMode,
    replyRecipients,
    conversation,
    conversationLoading,
    subject,
    body,
    sending,
    errorDialog,
    setSelectedRecipientIds,
    setIsBroadcast,
    setSubject,
    setBody,
    handleSendMessage,
    closeErrorDialog,
  } =
    useSendMessagePage();

  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-950 transition-colors dark:bg-[#030712] dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
            <MessagesWorkspaceNav
              active="new"
            />

            <section className="bg-white dark:bg-slate-900">
              <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-700/80 lg:px-6">
                <h1 className="text-xl font-bold text-slate-950 dark:text-white">
                  {replyMode
                    ? "Svar på besked"
                    : "Ny besked"}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {replyMode
                    ? "Skriv dit svar. Den tidligere samtale vises nedenfor."
                    : "Skriv en ny besked til en eller flere medarbejdere."}
                </p>
              </header>

              <div className="space-y-5 p-5 lg:p-6">
                {authLoading ? (
                  <div
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                    role="status"
                  >
                    Indlæser...
                  </div>
                ) : (
                  <>
                    <SendMessageForm
                      users={
                        users
                      }
                      selectedRecipientIds={
                        selectedRecipientIds
                      }
                      isBroadcast={
                        isBroadcast
                      }
                      canSendBroadcastMessages={
                        canSendBroadcastMessages
                      }
                      replyMode={
                        replyMode
                      }
                      replyRecipients={
                        replyRecipients
                      }
                      subject={
                        subject
                      }
                      body={
                        body
                      }
                      sending={
                        sending
                      }
                      onRecipientIdsChange={
                        setSelectedRecipientIds
                      }
                      onBroadcastChange={
                        setIsBroadcast
                      }
                      onSubjectChange={
                        setSubject
                      }
                      onBodyChange={
                        setBody
                      }
                      onSubmit={
                        handleSendMessage
                      }
                    />

                    {conversationLoading && (
                      <div
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                        role="status"
                      >
                        Henter samtalen...
                      </div>
                    )}

                    {conversation && (
                      <MessageConversationContext
                        conversation={
                          conversation
                        }
                      />
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

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
