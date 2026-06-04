"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "./useApi";
import { useAuth } from "../providers/AuthProvider";
import { useRealtimeCore } from "./useRealtimeCore";

export function useRealtimeBadges() {
  const { apiFetch } = useApi();
  const { token } = useAuth();

  const [poolCount, setPoolCount] = useState(0);
  const [directCount, setDirectCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [staffingRequestCount, setStaffingRequestCount] = useState(0);
  const [leaveRequestCount, setLeaveRequestCount] = useState(0);

  const getCount = (data: unknown) => {
    if (typeof data === "number") return data;

    if (data && typeof data === "object" && "count" in data) {
      return Number(data.count || 0);
    }

    return 0;
  };

  const getPendingStaffingCount = (data: unknown) => {
    if (!Array.isArray(data)) return 0;

    return data.filter((request) => request?.status === "PENDING").length;
  };

  const getPendingLeaveRequestCount = (data: unknown) => {
    if (!Array.isArray(data)) return 0;

    return data.filter((request) => request?.status === "PENDING").length;
  };

  const refreshBadges = useCallback(async () => {
    if (!token) return;

    try {
      const [
        poolRes,
        directRes,
        messagesRes,
        notificationsRes,
        staffingRes,
        leaveRequestsRes,
      ] = await Promise.all([
        apiFetch("/shift-trades/pool-count"),
        apiFetch("/shift-trades/direct-count"),
        apiFetch("/messages/unread-count"),
        apiFetch("/notifications/unread-count"),
        apiFetch("/staffing-requests/mine"),
        apiFetch("/leave-requests"),
      ]);

      const [
        poolData,
        directData,
        messagesData,
        notificationsData,
        staffingData,
        leaveRequestsData,
      ] = await Promise.all([
        poolRes.ok ? poolRes.json() : { count: 0 },
        directRes.ok ? directRes.json() : { count: 0 },
        messagesRes.ok ? messagesRes.json() : { count: 0 },
        notificationsRes.ok ? notificationsRes.json() : { count: 0 },
        staffingRes.ok ? staffingRes.json() : [],
        leaveRequestsRes.ok ? leaveRequestsRes.json() : [],
      ]);

      setPoolCount(getCount(poolData));
      setDirectCount(getCount(directData));
      setUnreadMessages(getCount(messagesData));
      setNotificationCount(getCount(notificationsData));
      setStaffingRequestCount(getPendingStaffingCount(staffingData));
      setLeaveRequestCount(getPendingLeaveRequestCount(leaveRequestsData));
    } catch {
      setPoolCount(0);
      setDirectCount(0);
      setUnreadMessages(0);
      setNotificationCount(0);
      setStaffingRequestCount(0);
      setLeaveRequestCount(0);
    }
  }, [apiFetch, token]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  useRealtimeCore({
    onShiftUpdated: refreshBadges,
    onShiftTradeUpdated: refreshBadges,
    onNotification: refreshBadges,
    onMessage: refreshBadges,
    onStaffingRequestUpdated: refreshBadges,
    onLeaveRequestUpdated: refreshBadges,
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
