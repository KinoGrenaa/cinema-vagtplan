"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useApi } from "@/app/hooks/useApi";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCinemaModules } from "@/app/providers/CinemaModulesProvider";

import {
  getErrorMessage,
  readErrorMessage,
} from "../../helpers/core/notificationHelpers";
import type {
  Message,
  ShiftTrade,
} from "../../helpers/core/notificationTypes";

type UseNotificationsExtraDataParams = {
  showError: (
    title: string,
    description: string,
  ) => void;
};

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const selectedCinemaId =
    window.localStorage.getItem(
      "masterSelectedCinemaId",
    );

  if (!selectedCinemaId) {
    return undefined;
  }

  return selectedCinemaId;
}

function getMasterCinemaQuery(
  user: any,
) {
  const isGlobalMaster =
    user?.role === "MASTER" &&
    !user?.cinemaId;

  if (!isGlobalMaster) {
    return "";
  }

  const selectedCinemaId =
    getSelectedMasterCinemaId();

  if (!selectedCinemaId) {
    return undefined;
  }

  return `?cinemaId=${encodeURIComponent(
    selectedCinemaId,
  )}`;
}

function getMessagesEndpoint(
  user: any,
) {
  const cinemaQuery =
    getMasterCinemaQuery(user);

  if (cinemaQuery === undefined) {
    return undefined;
  }

  return `/messages${cinemaQuery}`;
}

function getShiftTradesEndpoint(
  user: any,
) {
  const cinemaQuery =
    getMasterCinemaQuery(user);

  if (cinemaQuery === undefined) {
    return undefined;
  }

  return `/shift-trades${cinemaQuery}`;
}

export function useNotificationsExtraData({
  showError,
}: UseNotificationsExtraDataParams) {
  const { apiFetch } = useApi();
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const {
    loading: modulesLoading,
    isModuleEnabled,
  } = useCinemaModules();

  const messagesEnabled =
    isModuleEnabled("MESSAGES");
  const shiftTradesEnabled =
    isModuleEnabled("SHIFT_TRADES");

  const [messages, setMessages] =
    useState<Message[]>([]);
  const [
    shiftTrades,
    setShiftTrades,
  ] = useState<ShiftTrade[]>([]);
  const [
    extraLoading,
    setExtraLoading,
  ] = useState(true);

  const fetchExtraData = useCallback(
    async (
      showErrorDialog = true,
    ) => {
      if (!user) {
        setMessages([]);
        setShiftTrades([]);
        setExtraLoading(false);
        return;
      }

      try {
        setExtraLoading(true);

        const messagesEndpoint =
          messagesEnabled
            ? getMessagesEndpoint(user)
            : undefined;
        const shiftTradesEndpoint =
          shiftTradesEnabled
            ? getShiftTradesEndpoint(
                user,
              )
            : undefined;

        const [
          messagesResponse,
          tradesResponse,
        ] = await Promise.all([
          messagesEndpoint
            ? apiFetch(messagesEndpoint)
            : Promise.resolve(
                undefined,
              ),
          shiftTradesEndpoint
            ? apiFetch(
                shiftTradesEndpoint,
              )
            : Promise.resolve(
                undefined,
              ),
        ]);

        if (
          messagesResponse &&
          !messagesResponse.ok
        ) {
          throw new Error(
            await readErrorMessage(
              messagesResponse,
              "Kunne ikke hente ulæste beskeder.",
            ),
          );
        }

        if (
          tradesResponse &&
          !tradesResponse.ok
        ) {
          throw new Error(
            await readErrorMessage(
              tradesResponse,
              "Kunne ikke hente vagtbytter.",
            ),
          );
        }

        const [
          messagesData,
          tradesData,
        ] = await Promise.all([
          messagesResponse
            ? messagesResponse.json()
            : Promise.resolve([]),
          tradesResponse
            ? tradesResponse.json()
            : Promise.resolve([]),
        ]);

        setMessages(
          Array.isArray(messagesData)
            ? messagesData
            : [],
        );
        setShiftTrades(
          Array.isArray(tradesData)
            ? tradesData
            : [],
        );
      } catch (error) {
        if (showErrorDialog) {
          showError(
            "Kunne ikke hente notifikationsoversigt",
            getErrorMessage(
              error,
              "Der opstod en uventet fejl under hentning af notifikationsoversigten.",
            ),
          );
        }

        setMessages([]);
        setShiftTrades([]);
      } finally {
        setExtraLoading(false);
      }
    },
    [
      apiFetch,
      messagesEnabled,
      shiftTradesEnabled,
      showError,
      user,
    ],
  );

  useEffect(() => {
    if (
      authLoading ||
      modulesLoading
    ) {
      return;
    }

    if (!user) {
      window.location.href = "/";
      return;
    }

    void fetchExtraData(true);
  }, [
    authLoading,
    fetchExtraData,
    modulesLoading,
    user,
  ]);

  const refreshExtraDataSilently =
    useCallback(() => {
      void fetchExtraData(false);
    }, [fetchExtraData]);

  useRealtimeCore({
    onMessage: messagesEnabled
      ? refreshExtraDataSilently
      : undefined,
    onShiftUpdated:
      shiftTradesEnabled
        ? refreshExtraDataSilently
        : undefined,
    onShiftTradeUpdated:
      shiftTradesEnabled
        ? refreshExtraDataSilently
        : undefined,
  });

  const unreadMessages = useMemo(
    () => {
      if (
        !user ||
        !messagesEnabled
      ) {
        return [];
      }

      return messages.filter(
        (message) => {
          const isUnread =
            !message.readAt;
          const isForMe =
            message.isBroadcast ||
            message.receiver?.id ===
              user.id ||
            !message.receiver;

          return (
            isUnread && isForMe
          );
        },
      );
    },
    [
      messages,
      messagesEnabled,
      user,
    ],
  );

  const directTrades = useMemo(
    () => {
      if (
        !user ||
        !shiftTradesEnabled
      ) {
        return [];
      }

      return shiftTrades.filter(
        (trade) =>
          trade.status === "OPEN" &&
          trade.type === "DIRECT" &&
          trade.targetUserId ===
            user.id &&
          new Date(
            trade.shift.startTime,
          ) > new Date(),
      );
    },
    [
      shiftTrades,
      shiftTradesEnabled,
      user,
    ],
  );

  const poolTrades = useMemo(
    () => {
      if (
        !user ||
        !shiftTradesEnabled
      ) {
        return [];
      }

      return shiftTrades.filter(
        (trade) =>
          trade.status === "OPEN" &&
          trade.type === "POOL" &&
          trade.offeredByUserId !==
            user.id &&
          new Date(
            trade.shift.startTime,
          ) > new Date(),
      );
    },
    [
      shiftTrades,
      shiftTradesEnabled,
      user,
    ],
  );

  return {
    authLoading:
      authLoading ||
      modulesLoading,
    extraLoading,
    unreadMessages,
    directTrades,
    poolTrades,
    moduleAccess: {
      messages: messagesEnabled,
      shiftTrades:
        shiftTradesEnabled,
    },
  };
}
