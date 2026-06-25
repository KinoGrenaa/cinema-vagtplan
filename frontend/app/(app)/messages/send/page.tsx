"use client";

import InfoModal from "@/app/components/modals/InfoModal";
import SendMessageForm from "./components/SendMessageForm";
import SendMessagesHeader from "./components/SendMessagesHeader";
import { useSendMessagePage } from "./hooks/useSendMessagePage";

export default function SendMessagePage() {
  const {
    authLoading,
    users,
    receiverId,
    isBroadcast,
    subject,
    body,
    sending,
    errorDialog,
    setReceiverId,
    setIsBroadcast,
    setSubject,
    setBody,
    handleSendMessage,
    closeErrorDialog,
  } = useSendMessagePage();

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Indlæser...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <SendMessagesHeader />

        <SendMessageForm
          users={users}
          receiverId={receiverId}
          isBroadcast={isBroadcast}
          subject={subject}
          body={body}
          sending={sending}
          onReceiverIdChange={setReceiverId}
          onBroadcastChange={setIsBroadcast}
          onSubjectChange={setSubject}
          onBodyChange={setBody}
          onSubmit={handleSendMessage}
        />
      </div>

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
