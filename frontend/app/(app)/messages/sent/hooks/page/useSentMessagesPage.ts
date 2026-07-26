import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useConfirm,
} from "@/app/hooks/useConfirm";
import {
  useMessages,
} from "../../../../../hooks/useMessages";

import {
  getErrorMessage,
  groupMessagesBySentDate,
} from "../../helpers/core/sentMessageHelpers";

type ErrorDialogState = {
  open: boolean;
  title: string;
  description: string;
};

const initialErrorDialog:
  ErrorDialogState = {
    open: false,
    title: "",
    description: "",
  };

export function useSentMessagesPage() {
  const confirmDialog =
    useConfirm();

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
    errorDialog,
    setErrorDialog,
  ] =
    useState<ErrorDialogState>(
      initialErrorDialog,
    );

  const showErrorDialog =
    useCallback(
      (
        title: string,
        description: string,
      ) => {
        setErrorDialog({
          open: true,
          title,
          description,
        });
      },
      [],
    );

  const closeErrorDialog =
    useCallback(() => {
      setErrorDialog(
        initialErrorDialog,
      );
    }, []);

  const handleMessagesError =
    useCallback(
      (message: string) => {
        showErrorDialog(
          "Kunne ikke hente sendte beskeder",
          message,
        );
      },
      [showErrorDialog],
    );

  const {
    loading,
    loadingMore,
    hasMore,
    sortedMessages,
    loadMore,
    archive,
  } = useMessages({
    mode: "sent",
    onError:
      handleMessagesError,
  });

  const groupedMessages =
    useMemo(() => {
      return groupMessagesBySentDate(
        sortedMessages,
      );
    }, [sortedMessages]);

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
          return [];
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
      (current) =>
        current ===
        messageId
          ? null
          : messageId,
    );
  }

  function handleArchive(
    messageId: number,
  ) {
    confirmDialog.confirm({
      title: "Arkiver besked",
      description:
        "Vil du arkivere denne besked?",
      confirmText: "Arkiver",
      cancelText:
        "Annuller",
      confirmVariant:
        "primary",
      onConfirm: async () => {
        try {
          await archive(
            messageId,
          );

          if (
            expandedMessageId ===
            messageId
          ) {
            setExpandedMessageId(
              null,
            );
          }
        } catch (error) {
          showErrorDialog(
            "Beskeden kunne ikke arkiveres",
            getErrorMessage(
              error,
              "Der opstod en fejl, da beskeden skulle arkiveres.\nPrøv igen.",
            ),
          );
        }
      },
    });
  }

  return {
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
  };
}
