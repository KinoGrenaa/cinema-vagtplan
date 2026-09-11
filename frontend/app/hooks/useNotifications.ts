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
  fetchUnreadNotificationSummary,
  markNotificationAsRead,
  markNotificationCategoryAsRead,
  type NotificationReadCategory,
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
    systemUnreadCount,
    setSystemUnreadCount,
  ] = useState(0);
  const [
    directResultUnreadCount,
    setDirectResultUnreadCount,
  ] = useState(0);
  const [
    poolResultUnreadCount,
    setPoolResultUnreadCount,
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
          setSystemUnreadCount(0);
          setDirectResultUnreadCount(0);
          setPoolResultUnreadCount(0);
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
            unreadSummary,
          ] =
            await Promise.all([
              fetchNotificationPage(
                activeCinemaId,
                {
                  unreadOnly,
                },
              ),
              fetchUnreadNotificationSummary(
                activeCinemaId,
              ),
            ]);

          setNotifications(
            page.items,
          );
          setUnreadCount(
            unreadSummary.count,
          );
          setSystemUnreadCount(
            unreadSummary.systemCount,
          );
          setDirectResultUnreadCount(
            unreadSummary.directTradeResultCount,
          );
          setPoolResultUnreadCount(
            unreadSummary.poolTradeResultCount,
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
              "Der opstod en fejl under hentning af notifikationer.",
            ),
          );
          setNotifications([]);
          setUnreadCount(0);
          setSystemUnreadCount(0);
          setDirectResultUnreadCount(0);
          setPoolResultUnreadCount(0);
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
          await loadNotifications(
            false,
          );
          window.dispatchEvent(
            new Event(
              "notificationBadgesRefresh",
            ),
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
        loadNotifications,
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

  const markCategoryAsRead =
    useCallback(
      async (
        category:
          NotificationReadCategory,
      ) => {
        if (!activeCinemaId) {
          return 0;
        }

        try {
          const count =
            await markNotificationCategoryAsRead(
              activeCinemaId,
              category,
            );

          await loadNotifications(
            false,
          );
          window.dispatchEvent(
            new Event(
              "notificationBadgesRefresh",
            ),
          );

          return count;
        } catch (error) {
          onError?.(
            getErrorMessage(
              error,
              "Der opstod en fejl under markering af notifikationer som læst.",
            ),
          );

          throw error;
        }
      },
      [
        activeCinemaId,
        loadNotifications,
        onError,
      ],
    );

  return {
    loading:
      loading ||
      authLoading,
    loadingMore,
    notifications,
    unreadCount,
    systemUnreadCount,
    directResultUnreadCount,
    poolResultUnreadCount,
    unreadOnly,
    hasMore,
    loadNotifications,
    loadMore,
    toggleUnreadOnly,
    markAsRead,
    markCategoryAsRead,
  };
}
