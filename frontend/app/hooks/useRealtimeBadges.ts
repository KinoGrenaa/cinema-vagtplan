"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function useRealtimeBadges() {
  const [poolCount, setPoolCount] = useState(0);
  const [directCount, setDirectCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

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
      const [poolRes, directRes, messagesRes] = await Promise.all([
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
      ]);

      const poolData = await poolRes.json();
      const directData = await directRes.json();
      const messagesData = await messagesRes.json();

      setPoolCount(poolData.count ?? 0);
      setDirectCount(directData.count ?? 0);
      setUnreadMessages(messagesData.count ?? 0);
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

    return () => {
      socket.disconnect();
    };
  }, [refreshBadges]);

  return {
    poolCount,
    directCount,
    unreadMessages,
    refreshBadges,
  };
}