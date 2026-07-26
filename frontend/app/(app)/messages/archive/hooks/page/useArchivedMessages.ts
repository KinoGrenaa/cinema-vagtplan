import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRealtimeCore,
} from "@/app/hooks/useRealtimeCore";
import {
  apiFetch,
} from "@/app/lib/api";
import {
  useAuth,
} from "@/app/providers/AuthProvider";
import {
  fetchArchivedMessagePage,
} from "@/app/services/messagesService";

import {
  getArchiveSectionLabel,
  getRestoreTargetLabel,
  groupMessagesBySentDate,
  readErrorMessage,
} from "../../helpers/core/archiveMessageHelpers";
import type {
  ArchiveSection,
  Message,
} from "../../helpers/core/archiveMessageTypes";

type ErrorDialog = {
  showError:
    (
      title: string,
      description: string,
    ) => void;
};

type RestoreConfirmOptions = {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant:
    "primary";
  onConfirm:
    () => Promise<void>;
};

type ConfirmDialog = {
  confirm:
    (
      options:
        RestoreConfirmOptions,
    ) => void;
};

type UseArchivedMessagesOptions = {
  confirmDialog:
    ConfirmDialog;
  errorDialog:
    ErrorDialog;
};

function mergeMessages(
  current: Message[],
  incoming: Message[],
) {
  const byId =
    new Map<number, Message>();

  for (const message of [
    ...current,
    ...incoming,
  ]) {
    byId.set(
      message.id,
      message,
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) =>
      new Date(
        right.createdAt,
      ).getTime() -
      new Date(
        left.createdAt,
      ).getTime(),
  );
}

export function useArchivedMessages({
  confirmDialog,
  errorDialog,
}: UseArchivedMessagesOptions) {
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const userId =
    user?.id ?? null;
  const showErrorRef =
    useRef(
      errorDialog.showError,
    );
  const confirmRef =
    useRef(
      confirmDialog.confirm,
    );

  showErrorRef.current =
    errorDialog.showError;
  confirmRef.current =
    confirmDialog.confirm;

  const [
    messages,
    setMessages,
  ] =
    useState<Message[]>([]);
  const [
    activeSection,
    setActiveSection,
  ] =
    useState<ArchiveSection>(
      "received",
    );
  const [
    counts,
    setCounts,
  ] = useState({
    received: 0,
    sent: 0,
  });
  const [
    expandedDateKeys,
    setExpandedDateKeys,
  ] =
    useState<string[]>([]);
  const [
    expandedMessageId,
    setExpandedMessageId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);
  const [
    hasMore,
    setHasMore,
  ] = useState(false);
  const [
    nextBeforeId,
    setNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    restoringMessageId,
    setRestoringMessageId,
  ] =
    useState<number | null>(
      null,
    );

  const fetchMessages =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (userId === null) {
          setMessages([]);
          setCounts({
            received: 0,
            sent: 0,
          });
          setHasMore(false);
          setNextBeforeId(
            null,
          );
          setLoading(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          const page =
            await fetchArchivedMessagePage(
              activeSection,
            );

          setMessages(
            page.items,
          );
          setCounts(
            page.counts,
          );
          setHasMore(
            page.hasMore,
          );
          setNextBeforeId(
            page.nextBeforeId,
          );
        } catch (error) {
          showErrorRef.current(
            "Kunne ikke hente arkiverede beskeder",
            error instanceof Error
              ? error.message
              : "Der opstod en uventet fejl under hentning af arkiverede beskeder.",
          );
          setMessages([]);
          setCounts({
            received: 0,
            sent: 0,
          });
          setHasMore(false);
          setNextBeforeId(
            null,
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        activeSection,
        userId,
      ],
    );

  const loadMore =
    useCallback(async () => {
      if (
        !hasMore ||
        !nextBeforeId ||
        loadingMore
      ) {
        return;
      }

      try {
        setLoadingMore(true);

        const page =
          await fetchArchivedMessagePage(
            activeSection,
            {
              beforeId:
                nextBeforeId,
            },
          );

        setMessages(
          (current) =>
            mergeMessages(
              current,
              page.items,
            ),
        );
        setCounts(
          page.counts,
        );
        setHasMore(
          page.hasMore,
        );
        setNextBeforeId(
          page.nextBeforeId,
        );
      } catch (error) {
        showErrorRef.current(
          "Kunne ikke hente ældre arkiverede beskeder",
          error instanceof Error
            ? error.message
            : "Der opstod en uventet fejl under hentning af ældre arkiverede beskeder.",
        );
      } finally {
        setLoadingMore(false);
      }
    }, [
      activeSection,
      hasMore,
      loadingMore,
      nextBeforeId,
    ]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (userId === null) {
      window.location.href =
        "/";
      return;
    }

    void fetchMessages();
  }, [
    authLoading,
    fetchMessages,
    userId,
  ]);

  const refreshMessagesSilently =
    useCallback(() => {
      void fetchMessages(
        false,
      );
    }, [fetchMessages]);

  useRealtimeCore({
    onMessage:
      refreshMessagesSilently,
  });

  const groupedMessages =
    useMemo(() => {
      return groupMessagesBySentDate(
        messages,
      );
    }, [messages]);

  useEffect(() => {
    setExpandedDateKeys(
      (current) => {
        const validKeys =
          groupedMessages.map(
            (group) =>
              group.dateKey,
          );

        if (
          validKeys.length ===
          0
        ) {
          return current.length ===
            0
            ? current
            : [];
        }

        const currentValidKeys =
          current.filter(
            (dateKey) =>
              validKeys.includes(
                dateKey,
              ),
          );
        const latestDateKey =
          validKeys[0];
        const nextKeys =
          currentValidKeys.includes(
            latestDateKey,
          )
            ? currentValidKeys
            : [
                latestDateKey,
                ...currentValidKeys,
              ];
        const isUnchanged =
          nextKeys.length ===
            current.length &&
          nextKeys.every(
            (
              dateKey,
              index,
            ) =>
              dateKey ===
              current[index],
          );

        return isUnchanged
          ? current
          : nextKeys;
      },
    );
  }, [groupedMessages]);

  function switchSection(
    section:
      ArchiveSection,
  ) {
    if (
      section ===
      activeSection
    ) {
      return;
    }

    setActiveSection(section);
    setMessages([]);
    setExpandedMessageId(
      null,
    );
    setExpandedDateKeys([]);
    setHasMore(false);
    setNextBeforeId(null);
  }

  function toggleDateGroup(
    dateKey: string,
  ) {
    setExpandedDateKeys(
      (current) =>
        current.includes(
          dateKey,
        )
          ? current.filter(
              (
                currentDateKey,
              ) =>
                currentDateKey !==
                dateKey,
            )
          : [
              dateKey,
              ...current,
            ],
    );
  }

  function toggleMessage(
    messageId: number,
  ) {
    setExpandedMessageId(
      (currentId) =>
        currentId ===
        messageId
          ? null
          : messageId,
    );
  }

  async function restoreMessage(
    messageId: number,
    section:
      ArchiveSection,
  ) {
    try {
      setRestoringMessageId(
        messageId,
      );

      const response =
        await apiFetch(
          `/messages/${messageId}/unarchive`,
          {
            method: "PATCH",
          },
        );

      if (!response.ok) {
        showErrorRef.current(
          "Kunne ikke flytte beskeden tilbage",
          await readErrorMessage(
            response,
            `Der opstod en fejl under flytning af beskeden tilbage til ${getRestoreTargetLabel(
              section,
            )}.`,
          ),
        );
        return;
      }

      setMessages(
        (currentMessages) =>
          currentMessages.filter(
            (message) =>
              message.id !==
              messageId,
          ),
      );
      setCounts(
        (current) => ({
          ...current,
          [section]:
            Math.max(
              0,
              current[
                section
              ] - 1,
            ),
        }),
      );
      setExpandedMessageId(
        (currentId) =>
          currentId ===
          messageId
            ? null
            : currentId,
      );
    } catch (error) {
      showErrorRef.current(
        "Kunne ikke flytte beskeden tilbage",
        error instanceof Error
          ? error.message
          : `Der opstod en uventet fejl under flytning af beskeden tilbage til ${getRestoreTargetLabel(
              section,
            )}.`,
      );
    } finally {
      setRestoringMessageId(
        null,
      );
    }
  }

  function confirmRestoreMessage(
    message: Message,
    section:
      ArchiveSection,
  ) {
    const targetLabel =
      getRestoreTargetLabel(
        section,
      );

    confirmRef.current({
      title:
        "Flyt besked tilbage",
      description:
        `Vil du flytte "${message.subject}" tilbage til ${targetLabel}?`,
      confirmText:
        "Flyt tilbage",
      cancelText:
        "Annuller",
      confirmVariant:
        "primary",
      onConfirm: async () => {
        await restoreMessage(
          message.id,
          section,
        );
      },
    });
  }

  const pageLoading =
    authLoading || loading;
  const messageCount =
    counts.received +
    counts.sent;
  const activeTotalCount =
    counts[activeSection];
  const activeLoadedCount =
    messages.length;
  const activeSectionLabel =
    getArchiveSectionLabel(
      activeSection,
    );
  const emptyText =
    activeSection === "sent"
      ? "Du har ingen sendte arkiverede beskeder."
      : "Du har ingen modtagne arkiverede beskeder.";

  return {
    pageLoading,
    loadingMore,
    hasMore,
    messageCount,
    activeSection,
    receivedCount:
      counts.received,
    sentCount:
      counts.sent,
    activeLoadedCount,
    activeTotalCount,
    activeSectionLabel,
    emptyText,
    groupedMessages,
    expandedDateKeys,
    expandedMessageId,
    restoringMessageId,
    loadMore,
    switchSection,
    toggleDateGroup,
    toggleMessage,
    confirmRestoreMessage,
  };
}
