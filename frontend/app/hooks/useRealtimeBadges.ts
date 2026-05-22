"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function useRealtimeBadges() {
  const [poolCount, setPoolCount] = useState(0);
  const [directCount, setDirectCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const getUser = () => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  };

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const refreshBadges = useCallback(async () => {
    const user = getUser();
    if (!user) return;

    try {
      const [poolRes, directRes, messagesRes, notificationsRes] =
        await Promise.all([
          fetch(
            `${API_URL}/shift-trades/pool-count?cinemaId=${user.cinemaId}&userId=${user.id}`,
            { headers: getHeaders() },
          ),
          fetch(
            `${API_URL}/shift-trades/direct-count?cinemaId=${user.cinemaId}&userId=${user.id}`,
            { headers: getHeaders() },
          ),
          fetch(`${API_URL}/messages/unread-count?userId=${user.id}`, {
            headers: getHeaders(),
          }),
          fetch(`${API_URL}/notifications/unread-count?userId=${user.id}`, {
            headers: getHeaders(),
          }),
        ]);

      const poolData = await poolRes.json();
      const directData = await directRes.json();
      const messagesData = await messagesRes.json();
      const notificationsData = await notificationsRes.json();

      setPoolCount(Number(poolData.count || 0));
      setDirectCount(Number(directData.count || 0));
      setUnreadMessages(Number(messagesData.count || 0));
      setNotificationCount(Number(notificationsData.count || 0));
    } catch {
      // Undgå at crashe menuen hvis backend ikke svarer
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
