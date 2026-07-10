"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useApi } from "@/app/hooks/useApi";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { useAuth } from "@/app/providers/AuthProvider";

import {
  getErrorMessage,
  readErrorMessage,
} from "../../helpers/notificationHelpers";
import type { Message, ShiftTrade } from "../../helpers/notificationTypes";

type UseNotificationsExtraDataParams = {
  showError: (title: string, description: string) => void;
};

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const selectedCinemaId = window.localStorage.getItem(
    "masterSelectedCinemaId",
  );

  if (!selectedCinemaId) {
    return undefined;
  }

  return selectedCinemaId;
}

function getMasterCinemaQuery(user: any) {
  const isGlobalMaster = user?.role === "MASTER" && !user?.cinemaId;

  if (!isGlobalMaster) {
    return "";
  }

  const selectedCinemaId = getSelectedMasterCinemaId();

  if (!selectedCinemaId) {
    return undefined;
  }

  return `?cinemaId=${encodeURIComponent(selectedCinemaId)}`;
}

function getMessagesEndpoint(user: any) {
  const cinemaQuery = getMasterCinemaQuery(user);

  if (cinemaQuery === undefined) {
    return undefined;
  }

  return `/messages${cinemaQuery}`;
}

function getShiftTradesEndpoint(user: any) {
  const cinemaQuery = getMasterCinemaQuery(user);

  if (cinemaQuery === undefined) {
    return undefined;
  }

  return `/shift-trades${cinemaQuery}`;
}

export function useNotificationsExtraData({
  showError,
}: UseNotificationsExtraDataParams) {
  const { apiFetch } = useApi();
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [extraLoading, setExtraLoading] = useState(true);

  const fetchExtraData = useCallback(
    async (showErrorDialog = true) => {
      if (!user) return;

      try {
        setExtraLoading(true);

        const messagesEndpoint = getMessagesEndpoint(user);
        const shiftTradesEndpoint = getShiftTradesEndpoint(user);

        const [messagesResponse, tradesResponse] = await Promise.all([
          messagesEndpoint ? apiFetch(messagesEndpoint) : Promise.resolve(undefined),
          shiftTradesEndpoint
            ? apiFetch(shiftTradesEndpoint)
            : Promise.resolve(undefined),
        ]);

        if (messagesResponse && !messagesResponse.ok) {
          throw new Error(
            await readErrorMessage(
              messagesResponse,
              "Kunne ikke hente ulæste beskeder.",
            ),
          );
        }

        if (tradesResponse && !tradesResponse.ok) {
          throw new Error(
            await readErrorMessage(
              tradesResponse,
              "Kunne ikke hente vagtbytter.",
            ),
          );
        }

        const [messagesData, tradesData] = await Promise.all([
          messagesResponse ? messagesResponse.json() : Promise.resolve([]),
          tradesResponse ? tradesResponse.json() : Promise.resolve([]),
        ]);

        setMessages(Array.isArray(messagesData) ? messagesData : []);
        setShiftTrades(Array.isArray(tradesData) ? tradesData : []);
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
    [apiFetch, showError, user],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchExtraData(true);
  }, [authLoading, fetchExtraData, user]);

  const refreshExtraDataSilently = useCallback(() => {
    fetchExtraData(false);
  }, [fetchExtraData]);

  useRealtimeCore({
    onMessage: refreshExtraDataSilently,
    onShiftUpdated: refreshExtraDataSilently,
    onShiftTradeUpdated: refreshExtraDataSilently,
  });

  const unreadMessages = useMemo(() => {
    if (!user) return [];

    return messages.filter((message) => {
      const isUnread = !message.readAt;
      const isForMe =
        message.isBroadcast || message.receiver?.id === user.id || !message.receiver;

      return isUnread && isForMe;
    });
  }, [messages, user]);

  const directTrades = useMemo(() => {
    if (!user) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === user.id &&
        new Date(trade.shift.startTime) > new Date(),
    );
  }, [shiftTrades, user]);

  const poolTrades = useMemo(() => {
    if (!user) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !== user.id &&
        new Date(trade.shift.startTime) > new Date(),
    );
  }, [shiftTrades, user]);

  return {
    authLoading,
    extraLoading,
    unreadMessages,
    directTrades,
    poolTrades,
  };
}
