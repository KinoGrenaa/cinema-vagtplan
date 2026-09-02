"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "../providers/AuthProvider";
import { useCinemaModules } from "../providers/CinemaModulesProvider";
import { useApi } from "./useApi";
import { useRealtimeCore } from "./useRealtimeCore";

function getCount(data: unknown) {
  if (typeof data === "number") {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "count" in data
  ) {
    return Number(data.count || 0);
  }

  return 0;
}

function getPendingCount(data: unknown) {
  if (!Array.isArray(data)) {
    return 0;
  }

  return data.filter(
    (item) =>
      item?.status === "PENDING",
  ).length;
}

export function useRealtimeBadges() {
  const { apiFetch } = useApi();
  const { token, user } = useAuth();
  const {
    loading: modulesLoading,
    hasCinemaContext,
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
  const [
    timeEntryActionCount,
    setTimeEntryActionCount,
  ] = useState(0);
  const refreshVersionRef =
    useRef(0);

  const shiftTradesEnabled =
    !modulesLoading &&
    hasCinemaContext &&
    isModuleEnabled(
      "SHIFT_TRADES",
    );
  const messagesEnabled =
    !modulesLoading &&
    hasCinemaContext &&
    isModuleEnabled("MESSAGES");
  const staffingRequestsEnabled =
    !modulesLoading &&
    hasCinemaContext &&
    isModuleEnabled(
      "STAFFING_REQUESTS",
    );
  const leaveEnabled =
    !modulesLoading &&
    hasCinemaContext &&
    isModuleEnabled("LEAVE");
  const timeTrackingEnabled =
    !modulesLoading &&
    hasCinemaContext &&
    isModuleEnabled(
      "TIME_TRACKING",
    );

  const resetBadges = useCallback(
    () => {
      setPoolCount(0);
      setDirectCount(0);
      setUnreadMessages(0);
      setNotificationCount(0);
      setStaffingRequestCount(0);
      setLeaveRequestCount(0);
      setTimeEntryActionCount(0);
    },
    [],
  );

  const getMasterCinemaQuery =
    useCallback(() => {
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
    }, [user]);

  const loadJson = useCallback(
    async (
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
    },
    [apiFetch],
  );

  const refreshBadges =
    useCallback(async () => {
      const refreshVersion =
        ++refreshVersionRef.current;

      if (
        !token ||
        !user ||
        modulesLoading ||
        !hasCinemaContext
      ) {
        resetBadges();
        return;
      }

      const masterCinemaQuery =
        getMasterCinemaQuery();

      if (
        masterCinemaQuery === null
      ) {
        resetBadges();
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
                  timeEntryActionData,
        ] = await Promise.all([
          loadJson(
            shiftTradesEnabled,
            `/shift-trades/pool-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            shiftTradesEnabled,
            `/shift-trades/direct-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            messagesEnabled,
            `/messages/unread-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            true,
            `/notifications/unread-count${masterCinemaQuery}`,
            { count: 0 },
          ),
          loadJson(
            staffingRequestsEnabled,
            `/staffing-requests/mine${masterCinemaQuery}`,
            [],
          ),
          loadJson(
            leaveEnabled,
            `/leave-requests${masterCinemaQuery}`,
            [],
          ),
          loadJson(
            timeTrackingEnabled,
            `/time-entries/me-action-required-count${masterCinemaQuery}`,
            { count: 0 },
          ),
        ]);

        if (
          refreshVersion !==
          refreshVersionRef.current
        ) {
          return;
        }

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
          getPendingCount(
            staffingData,
          ),
        );
        setLeaveRequestCount(
          getPendingCount(
            leaveRequestsData,
          ),
        );
        setTimeEntryActionCount(
          getCount(
            timeEntryActionData,
          ),
        );
      } catch {
        if (
          refreshVersion !==
          refreshVersionRef.current
        ) {
          return;
        }

        resetBadges();
      }
    }, [
      getMasterCinemaQuery,
      hasCinemaContext,
      leaveEnabled,
      loadJson,
      messagesEnabled,
      modulesLoading,
      resetBadges,
      shiftTradesEnabled,
      staffingRequestsEnabled,
      timeTrackingEnabled,
      token,
      user,
    ]);

  useEffect(() => {
    void refreshBadges();
  }, [refreshBadges]);

  useRealtimeCore({
    onShiftUpdated:
      shiftTradesEnabled
        ? refreshBadges
        : undefined,
    onShiftTradeUpdated:
      shiftTradesEnabled
        ? refreshBadges
        : undefined,
    onNotification:
      refreshBadges,
    onMessage:
      messagesEnabled
        ? refreshBadges
        : undefined,
    onStaffingRequestUpdated:
      staffingRequestsEnabled
        ? refreshBadges
        : undefined,
    onLeaveRequestUpdated:
      leaveEnabled
        ? refreshBadges
        : undefined,
    onTimeEntry:
      timeTrackingEnabled
        ? refreshBadges
        : undefined,
  });

  return {
    poolCount:
      shiftTradesEnabled
        ? poolCount
        : 0,
    directCount:
      shiftTradesEnabled
        ? directCount
        : 0,
    unreadMessages:
      messagesEnabled
        ? unreadMessages
        : 0,
    notificationCount,
    staffingRequestCount:
      staffingRequestsEnabled
        ? staffingRequestCount
        : 0,
    leaveRequestCount:
      leaveEnabled
        ? leaveRequestCount
        : 0,
    timeEntryActionCount:
      timeTrackingEnabled
        ? timeEntryActionCount
        : 0,
    refreshBadges,
  };
}
