"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useRealtimeBadges() {
  const [poolCount, setPoolCount] = useState(0);
  const [directCount, setDirectCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const getCount = (data: any) => {
    if (typeof data === "number") return data;
    return Number(data?.count || 0);
  };

  const refreshBadges = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [poolRes, directRes, messagesRes, notificationsRes] =
        await Promise.all([
          fetch(`${API_URL}/shift-trades/pool-count`, {
            headers: getHeaders(),
          }),
          fetch(`${API_URL}/shift-trades/direct-count`, {
            headers: getHeaders(),
          }),
          fetch(`${API_URL}/messages/unread-count`, {
            headers: getHeaders(),
          }),
          fetch(`${API_URL}/notifications/unread-count`, {
            headers: getHeaders(),
          }),
        ]);

      if (!poolRes.ok) setPoolCount(0);
      if (!directRes.ok) setDirectCount(0);
      if (!messagesRes.ok) setUnreadMessages(0);
      if (!notificationsRes.ok) setNotificationCount(0);

      const poolData = poolRes.ok ? await poolRes.json() : { count: 0 };
      const directData = directRes.ok ? await directRes.json() : { count: 0 };
      const messagesData = messagesRes.ok
        ? await messagesRes.json()
        : { count: 0 };
      const notificationsData = notificationsRes.ok
        ? await notificationsRes.json()
        : { count: 0 };

      setPoolCount(getCount(poolData));
      setDirectCount(getCount(directData));
      setUnreadMessages(getCount(messagesData));
      setNotificationCount(getCount(notificationsData));
    } catch {
      setPoolCount(0);
      setDirectCount(0);
      setUnreadMessages(0);
      setNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    refreshBadges();

    const socket = io(API_URL, {
      transports: ["websocket"],
    });

    socket.on("shiftTradesUpdated", refreshBadges);
    socket.on("newShiftTrade", refreshBadges);
    socket.on("newDirectShiftTrade", refreshBadges);
    socket.on("shiftAccepted", refreshBadges);
    socket.on("shiftRejected", refreshBadges);
    socket.on("shiftsUpdated", refreshBadges);
    socket.on("messagesUpdated", refreshBadges);
    socket.on("newMessage", refreshBadges);
    socket.on("notificationsUpdated", refreshBadges);

    return () => {
      socket.disconnect();
    };
  }, [refreshBadges]);

  return {
    poolCount,
    directCount,
    unreadMessages,
    notificationCount,
    refreshBadges,
  };
}
