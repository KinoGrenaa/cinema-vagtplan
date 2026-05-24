"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationsService";

import type { Notification } from "../types/notifications";

import { useRealtimeCore } from "./useRealtimeCore";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchNotifications();

      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);

      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useRealtimeCore({
    onNotification: loadNotifications,
  });

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.isRead).length;
  }, [notifications]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === notificationId
              ? {
                  ...notification,
                  isRead: true,
                }
              : notification,
          ),
        );

        await markNotificationAsRead(notificationId);
      } catch (error) {
        console.error(error);

        loadNotifications();
      }
    },
    [loadNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );

      await markAllNotificationsAsRead();
    } catch (error) {
      console.error(error);

      loadNotifications();
    }
  }, [loadNotifications]);

  return {
    loading,

    notifications,
    unreadCount,

    loadNotifications,

    markAsRead,
    markAllAsRead,
  };
}
