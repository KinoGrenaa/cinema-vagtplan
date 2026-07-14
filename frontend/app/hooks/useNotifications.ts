"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../providers/AuthProvider";
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

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallback;
}

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedCinemaId = Number(
    window.localStorage.getItem(
      "masterSelectedCinemaId",
    ),
  );

  return Number.isInteger(storedCinemaId) &&
    storedCinemaId > 0
    ? storedCinemaId
    : null;
}

export function useNotifications(
  input: UseNotificationsInput = {},
) {
  const { onError } = input;
  const { user, loading: authLoading } = useAuth();
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] =
    useState<number | null>(() =>
      getSelectedMasterCinemaId(),
    );
  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);

  const activeCinemaId =
    user?.role === "MASTER"
      ? selectedMasterCinemaId
      : user?.cinemaId ?? null;

  useEffect(() => {
    function handleMasterCinemaChanged() {
      setSelectedMasterCinemaId(
        getSelectedMasterCinemaId(),
      );
    }

    window.addEventListener(
      "masterSelectedCinemaChanged",
      handleMasterCinemaChanged,
    );
    window.addEventListener(
      "storage",
      handleMasterCinemaChanged,
    );

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        handleMasterCinemaChanged,
      );
      window.removeEventListener(
        "storage",
        handleMasterCinemaChanged,
      );
    };
  }, []);

  const loadNotifications = useCallback(
    async (showLoading = true) => {
      if (authLoading) {
        return;
      }

      if (!user || !activeCinemaId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }

        const data =
          await fetchNotifications(activeCinemaId);

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
    [
      activeCinemaId,
      authLoading,
      onError,
      user,
    ],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useRealtimeCore({
    onNotification: () =>
      void loadNotifications(false),
  });

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.isRead,
    ).length;
  }, [notifications]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      if (!activeCinemaId) {
        return;
      }

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

        await markNotificationAsRead(
          notificationId,
          activeCinemaId,
        );
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
    [
      activeCinemaId,
      loadNotifications,
      notifications,
      onError,
    ],
  );

  const markAllAsRead = useCallback(async () => {
    if (!activeCinemaId) {
      return;
    }

    const previousNotifications = notifications;

    try {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );

      await markAllNotificationsAsRead(
        activeCinemaId,
      );
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
  }, [
    activeCinemaId,
    loadNotifications,
    notifications,
    onError,
  ]);

  return {
    loading: loading || authLoading,
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}
