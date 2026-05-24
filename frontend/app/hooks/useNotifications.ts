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

  const loadNotifications = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const data = await fetchNotifications();

      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);

      setNotifications([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useRealtimeCore({
    onNotification: () => loadNotifications(false),
  });

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.isRead).length;
  }, [notifications]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      const previousNotifications = notifications;

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

        setNotifications(previousNotifications);

        await loadNotifications(false);
      }
    },
    [loadNotifications, notifications],
  );

  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notifications;

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

      setNotifications(previousNotifications);

      await loadNotifications(false);
    }
  }, [loadNotifications, notifications]);

  return {
    loading,

    notifications,
    unreadCount,

    loadNotifications,

    markAsRead,
    markAllAsRead,
  };
}
