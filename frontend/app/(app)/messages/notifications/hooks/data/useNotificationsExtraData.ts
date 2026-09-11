"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useApi,
} from "@/app/hooks/useApi";
import {
  useRealtimeCore,
} from "@/app/hooks/useRealtimeCore";
import {
  useAuth,
} from "@/app/providers/AuthProvider";
import {
  useCinemaModules,
} from "@/app/providers/CinemaModulesProvider";
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

type MessageNotificationOverview = {
  items?: Message[];
  total?: number;
  hasMore?: boolean;
};

type ShiftTradeNotificationOverview = {
  directTrades?: ShiftTrade[];
  poolTrades?: ShiftTrade[];
  directTotal?: number;
  poolTotal?: number;
};

function getSelectedMasterCinemaId() {
  if (
    typeof window ===
    "undefined"
  ) {
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

function getOverviewEndpoint(
  path: string,
  user: any,
) {
  const cinemaQuery =
    getMasterCinemaQuery(user);

  if (
    cinemaQuery === undefined
  ) {
    return undefined;
  }

  return `${path}${cinemaQuery}`;
}

function normalizeShiftTradeOverview(
  value: unknown,
) {
  const overview =
    value as
      | Partial<ShiftTradeNotificationOverview>
      | null
      | undefined;
  const directTrades =
    Array.isArray(
      overview?.directTrades,
    )
      ? overview.directTrades
      : [];
  const poolTrades =
    Array.isArray(
      overview?.poolTrades,
    )
      ? overview.poolTrades
      : [];
  const directTotal =
    typeof overview?.directTotal ===
      "number" &&
    Number.isInteger(
      overview.directTotal,
    ) &&
    overview.directTotal >= 0
      ? overview.directTotal
      : directTrades.length;
  const poolTotal =
    typeof overview?.poolTotal ===
      "number" &&
    Number.isInteger(
      overview.poolTotal,
    ) &&
    overview.poolTotal >= 0
      ? overview.poolTotal
      : poolTrades.length;

  return {
    directTrades,
    poolTrades,
    directTotal,
    poolTotal,
  };
}

function normalizeMessageOverview(
  value: unknown,
) {
  if (Array.isArray(value)) {
    return {
      items:
        value as Message[],
      total:
        value.length,
    };
  }

  const overview =
    value as
      | Partial<MessageNotificationOverview>
      | null
      | undefined;
  const items =
    Array.isArray(
      overview?.items,
    )
      ? overview.items
      : [];
  const total =
    typeof overview?.total ===
      "number" &&
    Number.isInteger(
      overview.total,
    ) &&
    overview.total >= 0
      ? overview.total
      : items.length;

  return {
    items,
    total,
  };
}

export function useNotificationsExtraData({
  showError,
}: UseNotificationsExtraDataParams) {
  const {
    apiFetch,
  } = useApi();
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const {
    loading: modulesLoading,
    isModuleEnabled,
  } = useCinemaModules();

  const messagesEnabled =
    isModuleEnabled(
      "MESSAGES",
    );
  const shiftTradesEnabled =
    isModuleEnabled(
      "SHIFT_TRADES",
    );

  const [
    unreadMessages,
    setUnreadMessages,
  ] =
    useState<Message[]>([]);
  const [
    unreadMessageCount,
    setUnreadMessageCount,
  ] =
    useState(0);
  const [
    directTrades,
    setDirectTrades,
  ] =
    useState<ShiftTrade[]>([]);
  const [
    poolTrades,
    setPoolTrades,
  ] =
    useState<ShiftTrade[]>([]);
  const [
    directTradeCount,
    setDirectTradeCount,
  ] = useState(0);
  const [
    poolTradeCount,
    setPoolTradeCount,
  ] = useState(0);
  const [
    extraLoading,
    setExtraLoading,
  ] = useState(true);

  const fetchExtraData =
    useCallback(
      async (
        showErrorDialog = true,
      ) => {
        if (!user) {
          setUnreadMessages([]);
          setUnreadMessageCount(0);
          setDirectTrades([]);
          setPoolTrades([]);
          setDirectTradeCount(0);
          setPoolTradeCount(0);
          setExtraLoading(false);
          return;
        }

        try {
          setExtraLoading(true);

          const messagesEndpoint =
            messagesEnabled
              ? getOverviewEndpoint(
                  "/messages/notification-overview",
                  user,
                )
              : undefined;
          const shiftTradesEndpoint =
            shiftTradesEnabled
              ? getOverviewEndpoint(
                  "/shift-trades/notification-overview",
                  user,
                )
              : undefined;

          const [
            messagesResponse,
            tradesResponse,
          ] =
            await Promise.all([
              messagesEndpoint
                ? apiFetch(
                    messagesEndpoint,
                  )
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
                "Kunne ikke hente aktive vagtbytter.",
              ),
            );
          }

          const [
            messagesData,
            tradesData,
          ] =
            await Promise.all([
              messagesResponse
                ? messagesResponse.json()
                : Promise.resolve({
                    items: [],
                    total: 0,
                  }),
              tradesResponse
                ? tradesResponse.json()
                : Promise.resolve({
                    directTrades: [],
                    poolTrades: [],
                    directTotal: 0,
                    poolTotal: 0,
                  }),
            ]);

          const normalizedMessages =
            normalizeMessageOverview(
              messagesData,
            );
          setUnreadMessages(
            normalizedMessages.items,
          );
          setUnreadMessageCount(
            normalizedMessages.total,
          );

          const normalizedTrades =
            normalizeShiftTradeOverview(
              tradesData,
            );
          setDirectTrades(
            normalizedTrades.directTrades,
          );
          setPoolTrades(
            normalizedTrades.poolTrades,
          );
          setDirectTradeCount(
            normalizedTrades.directTotal,
          );
          setPoolTradeCount(
            normalizedTrades.poolTotal,
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

          setUnreadMessages([]);
          setUnreadMessageCount(0);
          setDirectTrades([]);
          setPoolTrades([]);
          setDirectTradeCount(0);
          setPoolTradeCount(0);
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
      window.location.href =
        "/";
      return;
    }

    void fetchExtraData(
      true,
    );
  }, [
    authLoading,
    fetchExtraData,
    modulesLoading,
    user,
  ]);

  const refreshExtraDataSilently =
    useCallback(() => {
      void fetchExtraData(
        false,
      );
    }, [fetchExtraData]);

  useRealtimeCore({
    onMessage:
      messagesEnabled
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

  return {
    authLoading:
      authLoading ||
      modulesLoading,
    extraLoading,
    unreadMessages,
    unreadMessageCount,
    directTrades,
    poolTrades,
    directTradeCount,
    poolTradeCount,
    moduleAccess: {
      messages:
        messagesEnabled,
      shiftTrades:
        shiftTradesEnabled,
    },
  };
}
