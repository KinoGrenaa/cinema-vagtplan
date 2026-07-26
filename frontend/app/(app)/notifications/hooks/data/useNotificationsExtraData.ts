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

type ShiftTradeNotificationOverview = {
  directTrades:
    ShiftTrade[];
  poolTrades:
    ShiftTrade[];
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
          setDirectTrades([]);
          setPoolTrades([]);
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
                : Promise.resolve(
                    [],
                  ),
              tradesResponse
                ? tradesResponse.json()
                : Promise.resolve({
                    directTrades: [],
                    poolTrades: [],
                  }),
            ]);

          setUnreadMessages(
            Array.isArray(
              messagesData,
            )
              ? messagesData
              : [],
          );

          const normalizedTrades =
            tradesData as
              Partial<ShiftTradeNotificationOverview>;

          setDirectTrades(
            Array.isArray(
              normalizedTrades
                .directTrades,
            )
              ? normalizedTrades
                  .directTrades
              : [],
          );
          setPoolTrades(
            Array.isArray(
              normalizedTrades
                .poolTrades,
            )
              ? normalizedTrades
                  .poolTrades
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

          setUnreadMessages([]);
          setDirectTrades([]);
          setPoolTrades([]);
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
    directTrades,
    poolTrades,
    moduleAccess: {
      messages:
        messagesEnabled,
      shiftTrades:
        shiftTradesEnabled,
    },
  };
}
