"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "../providers/AuthProvider";
import {
  fetchNotificationPage,
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationsService";
import type {
  Notification,
} from "../types/notifications";
import {
  useRealtimeCore,
} from "./useRealtimeCore";

type UseNotificationsInput = {
  onError?:
    (message: string) => void;
};

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim().length >
      0
  ) {
    return error.message;
  }

  return fallback;
}

function getSelectedMasterCinemaId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const storedCinemaId =
    Number(
      window.localStorage.getItem(
        "masterSelectedCinemaId",
      ),
    );

  return Number.isInteger(
    storedCinemaId,
  ) &&
    storedCinemaId > 0
    ? storedCinemaId
    : null;
}

function mergeNotifications(
  current:
    Notification[],
  incoming:
    Notification[],
) {
  const byId =
    new Map<number, Notification>();

  for (const notification of [
    ...current,
    ...incoming,
  ]) {
    byId.set(
      notification.id,
      notification,
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) =>
      new Date(
        right.createdAt,
      ).getTime() -
      new Date(
        left.createdAt,
      ).getTime(),
  );
}

export function useNotifications(
  input:
    UseNotificationsInput = {},
) {
  const {
    onError,
  } = input;
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] =
    useState<number | null>(
      () =>
        getSelectedMasterCinemaId(),
    );
  const [
    notifications,
    setNotifications,
  ] =
    useState<Notification[]>(
      [],
    );
  const [
    unreadOnly,
    setUnreadOnly,
  ] = useState(false);
  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);
  const [
    hasMore,
    setHasMore,
  ] = useState(false);
  const [
    nextBeforeId,
    setNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );

  const activeCinemaId =
    user?.role === "MASTER"
      ? selectedMasterCinemaId
      : user?.cinemaId ??
        null;

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

  const loadNotifications =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (authLoading) {
          return;
        }

        if (
          !user ||
          !activeCinemaId
        ) {
          setNotifications([]);
          setUnreadCount(0);
          setHasMore(false);
          setNextBeforeId(
            null,
          );
          setLoading(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          const [
            page,
            count,
          ] =
            await Promise.all([
              fetchNotificationPage(
                activeCinemaId,
                {
                  unreadOnly,
                },
              ),
              fetchUnreadNotificationCount(
                activeCinemaId,
              ),
            ]);

          setNotifications(
            page.items,
          );
          setUnreadCount(count);
          setHasMore(
            page.hasMore,
          );
          setNextBeforeId(
            page.nextBeforeId,
          );
        } catch (error) {
          onError?.(
            getErrorMessage(
              error,
              "Der opstod en fejl under hentning af notifikationer.",
            ),
          );
          setNotifications([]);
          setUnreadCount(0);
          setHasMore(false);
          setNextBeforeId(
            null,
          );
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
        unreadOnly,
        user,
      ],
    );

  const loadMore =
    useCallback(async () => {
      if (
        !activeCinemaId ||
        !hasMore ||
        !nextBeforeId ||
        loadingMore
      ) {
        return;
      }

      try {
        setLoadingMore(true);

        const page =
          await fetchNotificationPage(
            activeCinemaId,
            {
              beforeId:
                nextBeforeId,
              unreadOnly,
            },
          );

        setNotifications(
          (current) =>
            mergeNotifications(
              current,
              page.items,
            ),
        );
        setHasMore(
          page.hasMore,
        );
        setNextBeforeId(
          page.nextBeforeId,
        );
      } catch (error) {
        onError?.(
          getErrorMessage(
            error,
            "Ældre notifikationer kunne ikke hentes.",
          ),
        );
      } finally {
        setLoadingMore(false);
      }
    }, [
      activeCinemaId,
      hasMore,
      loadingMore,
      nextBeforeId,
      onError,
      unreadOnly,
    ]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useRealtimeCore({
    onNotification: () =>
      void loadNotifications(
        false,
      ),
  });

  const markAsRead =
    useCallback(
      async (
        notificationId:
          number,
      ) => {
        if (!activeCinemaId) {
          return;
        }

        const previousNotifications =
          notifications;
        const previousUnreadCount =
          unreadCount;
        const wasUnread =
          notifications.some(
            (notification) =>
              notification.id ===
                notificationId &&
              !notification.isRead,
          );

        try {
          setNotifications(
            (current) =>
              unreadOnly
                ? current.filter(
                    (notification) =>
                      notification.id !==
                      notificationId,
                  )
                : current.map(
                    (
                      notification,
                    ) =>
                      notification.id ===
                      notificationId
                        ? {
                            ...notification,
                            isRead: true,
                          }
                        : notification,
                  ),
          );

          if (wasUnread) {
            setUnreadCount(
              (current) =>
                Math.max(
                  0,
                  current - 1,
                ),
            );
          }

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
          setNotifications(
            previousNotifications,
          );
          setUnreadCount(
            previousUnreadCount,
          );
        }
      },
      [
        activeCinemaId,
        notifications,
        onError,
        unreadCount,
        unreadOnly,
      ],
    );

  const toggleUnreadOnly =
    useCallback(() => {
      setUnreadOnly(
        (current) =>
          !current,
      );
    }, []);

  const markAllAsRead =
    useCallback(async () => {
      if (!activeCinemaId) {
        return;
      }

      const previousNotifications =
        notifications;
      const previousUnreadCount =
        unreadCount;
      const previousHasMore =
        hasMore;
      const previousNextBeforeId =
        nextBeforeId;

      try {
        setNotifications(
          (current) =>
            unreadOnly
              ? []
              : current.map(
                  (
                    notification,
                  ) => ({
                    ...notification,
                    isRead: true,
                  }),
                ),
        );
        setUnreadCount(0);

        if (unreadOnly) {
          setHasMore(false);
          setNextBeforeId(
            null,
          );
        }

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
        setNotifications(
          previousNotifications,
        );
        setUnreadCount(
          previousUnreadCount,
        );
        setHasMore(
          previousHasMore,
        );
        setNextBeforeId(
          previousNextBeforeId,
        );
      }
    }, [
      activeCinemaId,
      hasMore,
      nextBeforeId,
      notifications,
      onError,
      unreadCount,
      unreadOnly,
    ]);

  return {
    loading:
      loading ||
      authLoading,
    loadingMore,
    notifications,
    unreadCount,
    unreadOnly,
    hasMore,
    loadNotifications,
    loadMore,
    toggleUnreadOnly,
    markAsRead,
    markAllAsRead,
  };
}
