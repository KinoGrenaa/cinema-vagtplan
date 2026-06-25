"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { toast } from "sonner";
import { useApi } from "../../../hooks/useApi";
import { useAuth } from "../../../providers/AuthProvider";
import { sendMessage as sendMessageService } from "../../../services/messagesService";
import SendMessageForm from "./components/SendMessageForm";
import SendMessagesHeader from "./components/SendMessagesHeader";
import { getErrorMessage } from "./helpers/sendMessageHelpers";
import type { ErrorDialogState, User } from "./helpers/sendMessageTypes";

export default function SendMessagePage() {
  const { apiFetch } = useApi();
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [receiverId, setReceiverId] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });

  const showErrorDialog = useCallback((title: string, description: string) => {
    setErrorDialog({
      open: true,
      title,
      description,
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        setUsers([]);

        showErrorDialog(
          "Kunne ikke hente medarbejdere",
          "Modtagerlisten kunne ikke hentes. Prøv igen.",
        );

        return;
      }

      const data = await response.json();

      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);

      showErrorDialog(
        "Kunne ikke hente medarbejdere",
        "Modtagerlisten kunne ikke hentes. Prøv igen.",
      );
    }
  }, [apiFetch, showErrorDialog, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchUsers();
  }, [authLoading, fetchUsers, user]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !body.trim()) {
      showErrorDialog(
        "Beskeden kan ikke sendes",
        "Udfyld både emne og besked.",
      );
      return;
    }

    if (!isBroadcast && !receiverId) {
      showErrorDialog(
        "Beskeden kan ikke sendes",
        "Vælg en modtager eller send som broadcast.",
      );
      return;
    }

    try {
      setSending(true);

      await sendMessageService({
        subject: subject.trim(),
        body: body.trim(),
        receiverId: isBroadcast ? null : Number(receiverId),
        isBroadcast,
      });

      setReceiverId("");
      setIsBroadcast(false);
      setSubject("");
      setBody("");

      toast.success("Beskeden er sendt.");
    } catch (error) {
      showErrorDialog(
        "Beskeden kunne ikke sendes",
        getErrorMessage(
          error,
          "Der opstod en fejl, da beskeden skulle sendes. Prøv igen.",
        ),
      );
    } finally {
      setSending(false);
    }
  }

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
        onClose={() =>
          setErrorDialog({
            open: false,
            title: "",
            description: "",
          })
        }
      />
    </main>
  );
}
