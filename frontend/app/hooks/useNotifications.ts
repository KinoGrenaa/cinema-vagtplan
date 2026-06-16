"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationsService";

import type { Notification } from "../types/notifications";

import { useRealtimeCore } from "./useRealtimeCore";

type UseNotificationsInput = {
  onError?: (message: string) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function useNotifications(input: UseNotificationsInput = {}) {
  const { onError } = input;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const data = await fetchNotifications();

        setNotifications(data);
      } catch (error) {
        onError?.(
          getErrorMessage(
            error,
            "Der opstod en fejl under hentning af notifikationer.",
          ),
        );

        setNotifications([]);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [onError],
  );

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
        onError?.(
          getErrorMessage(
            error,
            "Der opstod en fejl under markering af notifikation som læst.",
          ),
        );

        setNotifications(previousNotifications);

        await loadNotifications(false);
      }
    },
    [loadNotifications, notifications, onError],
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
      onError?.(
        getErrorMessage(
          error,
          "Der opstod en fejl under markering af alle notifikationer som læst.",
        ),
      );

      setNotifications(previousNotifications);

      await loadNotifications(false);
    }
  }, [loadNotifications, notifications, onError]);

  return {
    loading,

    notifications,
    unreadCount,

    loadNotifications,

    markAsRead,
    markAllAsRead,
  };
}
