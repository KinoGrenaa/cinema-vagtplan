"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useApi } from "./useApi";
import { useAuth } from "../providers/AuthProvider";
import { useRealtimeCore } from "./useRealtimeCore";
import { useCinemaModules } from "../providers/CinemaModulesProvider";

export function useRealtimeBadges() {
  const { apiFetch } = useApi();
  const { token, user } = useAuth();
  const {
    isModuleEnabled,
  } = useCinemaModules();
  const [poolCount, setPoolCount] =
    useState(0);
  const [
    directCount,
    setDirectCount,
  ] = useState(0);
  const [
    unreadMessages,
    setUnreadMessages,
  ] = useState(0);
  const [
    notificationCount,
    setNotificationCount,
  ] = useState(0);
  const [
    staffingRequestCount,
    setStaffingRequestCount,
  ] = useState(0);
  const [
    leaveRequestCount,
    setLeaveRequestCount,
  ] = useState(0);

  const getCount = (
    data: unknown,
  ) => {
    if (
      typeof data === "number"
    ) {
      return data;
    }

    if (
      data &&
      typeof data === "object" &&
      "count" in data
    ) {
      return Number(
        data.count || 0,
      );
    }

    return 0;
  };

  const getPendingStaffingCount =
    (data: unknown) => {
      if (!Array.isArray(data)) {
        return 0;
      }

      return data.filter(
        (request) =>
          request?.status ===
          "PENDING",
      ).length;
    };

  const getPendingLeaveRequestCount =
    (data: unknown) => {
      if (!Array.isArray(data)) {
        return 0;
      }

      return data.filter(
        (request) =>
          request?.status ===
          "PENDING",
      ).length;
    };

  const getMasterCinemaQuery =
    () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return null;
      }

      if (
        user?.role !== "MASTER" ||
        user.cinemaId
      ) {
        return "";
      }

      const selectedCinemaId =
        window.localStorage.getItem(
          "masterSelectedCinemaId",
        );

      return selectedCinemaId
        ? `?cinemaId=${encodeURIComponent(
            selectedCinemaId,
          )}`
        : null;
    };

  const loadJson = async (
    enabled: boolean,
    endpoint: string,
    fallback: unknown,
  ) => {
    if (!enabled) {
      return fallback;
    }

    const response =
      await apiFetch(endpoint);

    return response.ok
      ? response.json()
      : fallback;
  };

  const refreshBadges =
    useCallback(async () => {
      if (!token) {
        return;
      }

      const masterCinemaQuery =
        getMasterCinemaQuery();

      if (
        masterCinemaQuery === null
      ) {
        setPoolCount(0);
        setDirectCount(0);
        setUnreadMessages(0);
        setNotificationCount(0);
        setStaffingRequestCount(0);
        setLeaveRequestCount(0);
        return;
      }

      try {
        const [
          poolData,
          directData,
          messagesData,
          notificationsData,
          staffingData,
          leaveRequestsData,
        ] = await Promise.all([
          loadJson(
            isModuleEnabled(
              "SHIFT_TRADES",
            ),
            `/shift-trades/pool-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            isModuleEnabled(
              "SHIFT_TRADES",
            ),
            `/shift-trades/direct-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            isModuleEnabled(
              "MESSAGES",
            ),
            `/messages/unread-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            true,
            `/notifications/unread-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            isModuleEnabled(
              "STAFFING_REQUESTS",
            ),
            `/staffing-requests/mine${masterCinemaQuery}`,
            [],
          ),
          loadJson(
            isModuleEnabled(
              "LEAVE",
            ),
            `/leave-requests${masterCinemaQuery}`,
            [],
          ),
        ]);

        setPoolCount(
          getCount(poolData),
        );
        setDirectCount(
          getCount(directData),
        );
        setUnreadMessages(
          getCount(messagesData),
        );
        setNotificationCount(
          getCount(
            notificationsData,
          ),
        );
        setStaffingRequestCount(
          getPendingStaffingCount(
            staffingData,
          ),
        );
        setLeaveRequestCount(
          getPendingLeaveRequestCount(
            leaveRequestsData,
          ),
        );
      } catch {
        setPoolCount(0);
        setDirectCount(0);
        setUnreadMessages(0);
        setNotificationCount(0);
        setStaffingRequestCount(0);
        setLeaveRequestCount(0);
      }
    }, [
      apiFetch,
      token,
      user,
      isModuleEnabled,
    ]);

  useEffect(() => {
    void refreshBadges();
  }, [refreshBadges]);

  useRealtimeCore({
    onShiftUpdated:
      refreshBadges,
    onShiftTradeUpdated:
      refreshBadges,
    onNotification:
      refreshBadges,
    onMessage: refreshBadges,
    onStaffingRequestUpdated:
      refreshBadges,
    onLeaveRequestUpdated:
      refreshBadges,
  });

  return {
    poolCount,
    directCount,
    unreadMessages,
    notificationCount,
    staffingRequestCount,
    leaveRequestCount,
    refreshBadges,
  };
}
