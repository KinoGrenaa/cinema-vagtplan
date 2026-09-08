import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { MessageConversation } from "@/app/types/messages";

import { useApi } from "../../../../../hooks/useApi";
import { useAuth } from "../../../../../providers/AuthProvider";
import {
  fetchMessageConversation,
  sendMessage as sendMessageService,
} from "../../../../../services/messagesService";

import { getErrorMessage } from "../../helpers/core/sendMessageHelpers";
import type {
  ErrorDialogState,
  User,
} from "../../helpers/core/sendMessageTypes";

type ReplyMode = "REPLY" | "REPLY_ALL" | null;

function canUserSendBroadcast(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as {
    role?: string;
    canSendBroadcastMessages?: boolean;
  };

  return (
    user.role === "ADMIN" ||
    user.role === "MASTER" ||
    user.canSendBroadcastMessages === true
  );
}

function currentUserId(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = Number((value as { id?: unknown }).id);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function replySubject(subject: string) {
  const trimmed = subject.trim();
  return /^sv:/i.test(trimmed) ? trimmed : `Sv: ${trimmed}`;
}

export function useSendMessagePage() {
  const router = useRouter();
  const { apiFetch } = useApi();
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<number | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>(null);
  const [conversation, setConversation] =
    useState<MessageConversation | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });

  const canSendBroadcastMessages = useMemo(
    () => canUserSendBroadcast(user),
    [user],
  );

  const showErrorDialog = useCallback((title: string, description: string) => {
    setErrorDialog({
      open: true,
      title,
      description,
    });
  }, []);

  const closeErrorDialog = useCallback(() => {
    setErrorDialog({
      open: false,
      title: "",
      description: "",
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const rawReplyTo = Number(params.get("replyTo"));

    if (!Number.isInteger(rawReplyTo) || rawReplyTo <= 0) {
      return;
    }

    const rawMode = params.get("replyMode");
    setReplyToMessageId(rawReplyTo);
    setReplyMode(rawMode === "REPLY_ALL" ? "REPLY_ALL" : "REPLY");
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        setUsers([]);
        showErrorDialog(
          "Kunne ikke hente medarbejdere",
          "Modtagerlisten kunne ikke hentes.\nPrøv igen.",
        );
        return;
      }

      const data = await response.json();
      const ownId = currentUserId(user);

      setUsers(
        Array.isArray(data)
          ? data.filter((item: User) => item.id !== ownId)
          : [],
      );
    } catch {
      setUsers([]);
      showErrorDialog(
        "Kunne ikke hente medarbejdere",
        "Modtagerlisten kunne ikke hentes.\nPrøv igen.",
      );
    }
  }, [apiFetch, showErrorDialog, user]);

  const loadConversation = useCallback(
    async (messageId: number) => {
      try {
        setConversationLoading(true);

        const next = await fetchMessageConversation(messageId);
        setConversation(next);

        const anchor =
          next.messages.find((message) => message.id === messageId) ??
          next.messages[next.messages.length - 1];

        if (anchor) {
          setSubject((current) =>
            current.trim() ? current : replySubject(anchor.subject),
          );
        }
      } catch (error) {
        setConversation(null);
        showErrorDialog(
          "Kunne ikke hente samtalen",
          getErrorMessage(
            error,
            "Den oprindelige besked kunne ikke hentes.\nPrøv igen.",
          ),
        );
      } finally {
        setConversationLoading(false);
      }
    },
    [showErrorDialog],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/";
      return;
    }

    void fetchUsers();

    if (replyToMessageId) {
      void loadConversation(replyToMessageId);
    }
  }, [
    authLoading,
    fetchUsers,
    loadConversation,
    replyToMessageId,
    user,
  ]);

  const replyRecipients = useMemo(() => {
    if (!conversation || !replyMode) {
      return [];
    }

    return replyMode === "REPLY_ALL"
      ? conversation.reply.replyAllRecipients
      : conversation.reply.replyRecipients;
  }, [conversation, replyMode]);

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();

    if (!subject.trim() || !body.trim()) {
      showErrorDialog(
        "Beskeden kan ikke sendes",
        "Udfyld både emne og besked.",
      );
      return;
    }

    if (replyMode && (!replyToMessageId || !conversation)) {
      showErrorDialog(
        "Svaret kan ikke sendes",
        "Den oprindelige samtale er ikke klar endnu.",
      );
      return;
    }

    if (replyMode === "REPLY" && !conversation?.reply.canReply) {
      showErrorDialog(
        "Svaret kan ikke sendes",
        "Afsenderen er ikke længere en aktiv modtager.",
      );
      return;
    }

    if (replyMode === "REPLY_ALL" && !conversation?.reply.canReplyAll) {
      showErrorDialog(
        "Svaret kan ikke sendes",
        "Svar alle er ikke tilgængelig for denne besked.",
      );
      return;
    }

    if (!replyMode && !isBroadcast && selectedRecipientIds.length === 0) {
      showErrorDialog(
        "Beskeden kan ikke sendes",
        "Vælg mindst én modtager eller send til alle.",
      );
      return;
    }

    try {
      setSending(true);

      await sendMessageService({
        subject: subject.trim(),
        body: body.trim(),
        recipientIds:
          replyMode || isBroadcast ? undefined : selectedRecipientIds,
        isBroadcast: replyMode ? false : isBroadcast,
        replyToMessageId: replyMode ? replyToMessageId : undefined,
        replyMode: replyMode ?? undefined,
      });

      if (replyMode && replyToMessageId) {
        setBody("");
        toast.success("Svaret er sendt.");
        router.push("/messages");
        return;
      }

      setSelectedRecipientIds([]);
      setIsBroadcast(false);
      setSubject("");
      setBody("");
      toast.success("Beskeden er sendt.");
    } catch (error) {
      showErrorDialog(
        replyMode ? "Svaret kunne ikke sendes" : "Beskeden kunne ikke sendes",
        getErrorMessage(
          error,
          replyMode
            ? "Der opstod en fejl, da svaret skulle sendes.\nPrøv igen."
            : "Der opstod en fejl, da beskeden skulle sendes.\nPrøv igen.",
        ),
      );
    } finally {
      setSending(false);
    }
  }

  return {
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
  };
}
