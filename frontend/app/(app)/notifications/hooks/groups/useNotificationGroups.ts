"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Notification } from "@/app/types/notifications";

import {
  getCategoryLabel,
  groupByDate,
} from "../../helpers/core/notificationHelpers";
import type {
  DirectTradeNotificationItem,
  Message,
  NotificationCategory,
  ShiftTrade,
} from "../../helpers/core/notificationTypes";

type UseNotificationGroupsParams = {
  notifications: Notification[];
  unreadCount: number;
  unreadMessages: Message[];
  unreadMessageCount: number;
  directTrades: ShiftTrade[];
  poolTrades: ShiftTrade[];
  directTradeCount: number;
  poolTradeCount: number;
  messagesEnabled: boolean;
  shiftTradesEnabled: boolean;
};

export function useNotificationGroups({
  notifications,
  unreadCount,
  unreadMessages,
  unreadMessageCount,
  directTrades,
  poolTrades,
  directTradeCount,
  poolTradeCount,
  messagesEnabled,
  shiftTradesEnabled,
}: UseNotificationGroupsParams) {
  const [
    activeCategory,
    setActiveCategory,
  ] =
    useState<NotificationCategory>(
      "system",
    );
  const [
    expandedDateKeys,
    setExpandedDateKeys,
  ] = useState<string[]>([]);

  const visibleCategories =
    useMemo<
      NotificationCategory[]
    >(() => {
      const categories:
        NotificationCategory[] = [
        "system",
      ];

      if (messagesEnabled) {
        categories.push("messages");
      }

      if (shiftTradesEnabled) {
        categories.push(
          "directTrades",
          "poolTrades",
        );
      }

      return categories;
    }, [
      messagesEnabled,
      shiftTradesEnabled,
    ]);

  useEffect(() => {
    if (
      !visibleCategories.includes(
        activeCategory,
      )
    ) {
      setActiveCategory("system");
      setExpandedDateKeys([]);
    }
  }, [
    activeCategory,
    visibleCategories,
  ]);

  const systemNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          notification.type !== "SHIFT_ACCEPTED" &&
          notification.type !== "SHIFT_REJECTED",
      ),
    [notifications],
  );

  const directResultNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.isRead &&
          (notification.type === "SHIFT_ACCEPTED" ||
            notification.type === "SHIFT_REJECTED"),
      ),
    [notifications],
  );

  const systemGroups = useMemo(
    () =>
      groupByDate(
        systemNotifications,
        (notification) =>
          notification.createdAt,
        (notification) =>
          !notification.isRead,
      ),
    [systemNotifications],
  );

  const messageGroups = useMemo(
    () =>
      groupByDate(
        unreadMessages,
        (message) =>
          message.createdAt,
      ),
    [unreadMessages],
  );

  const directTradeGroups =
    useMemo(() => {
      const items: DirectTradeNotificationItem[] = [
        ...directTrades.map((trade) => ({
          kind: "trade" as const,
          trade,
        })),
        ...directResultNotifications.map((notification) => ({
          kind: "result" as const,
          notification,
        })),
      ];

      return groupByDate(
        items,
        (item) =>
          item.kind === "trade"
            ? item.trade.shift?.startTime ??
              item.trade.shiftStartTimeSnapshot ??
              item.trade.id.toString()
            : item.notification.createdAt,
      );
    }, [directResultNotifications, directTrades]);

  const poolTradeGroups = useMemo(
    () =>
      groupByDate(
        poolTrades,
        (trade) =>
          trade.shift?.startTime ??
          trade.shiftStartTimeSnapshot ??
          trade.id.toString(),
      ),
    [poolTrades],
  );

  const activeGroups = useMemo(
    () => {
      switch (activeCategory) {
        case "system":
          return systemGroups;
        case "messages":
          return messageGroups;
        case "directTrades":
          return directTradeGroups;
        case "poolTrades":
          return poolTradeGroups;
      }
    },
    [
      activeCategory,
      directTradeGroups,
      messageGroups,
      poolTradeGroups,
      systemGroups,
    ],
  );

  useEffect(() => {
    setExpandedDateKeys(
      (current) => {
        const validKeys =
          activeGroups.map(
            (group) =>
              group.dateKey,
          );

        if (
          validKeys.length === 0
        ) {
          return [];
        }

        const currentValidKeys =
          current.filter(
            (dateKey) =>
              validKeys.includes(
                dateKey,
              ),
          );
        const latestDateKey =
          validKeys[0];
        const nextKeys =
          currentValidKeys.includes(
            latestDateKey,
          )
            ? currentValidKeys
            : [
                latestDateKey,
                ...currentValidKeys,
              ];
        const isUnchanged =
          nextKeys.length ===
            current.length &&
          nextKeys.every(
            (
              dateKey,
              index,
            ) =>
              dateKey ===
              current[index],
          );

        return isUnchanged
          ? current
          : nextKeys;
      },
    );
  }, [activeGroups]);

  const directResultUnreadCount =
    directResultNotifications.length;
  const systemUnreadCount = Math.max(
    0,
    unreadCount - directResultUnreadCount,
  );
  const totalCount =
    unreadMessageCount +
    unreadCount +
    directTradeCount +
    poolTradeCount;

  const categoryCounts: Record<
    NotificationCategory,
    number
  > = {
    system: systemUnreadCount,
    messages:
      unreadMessageCount,
    directTrades:
      directTradeCount + directResultUnreadCount,
    poolTrades:
      poolTradeCount,
  };

  const activeCategoryLabel =
    getCategoryLabel(
      activeCategory,
    );
  const activeCount =
    activeCategory === "system"
      ? systemNotifications.length
      : categoryCounts[
          activeCategory
        ];

  function switchCategory(
    category: NotificationCategory,
  ) {
    if (
      !visibleCategories.includes(
        category,
      )
    ) {
      return;
    }

    setActiveCategory(category);
    setExpandedDateKeys([]);
  }

  function toggleDateGroup(
    dateKey: string,
  ) {
    setExpandedDateKeys(
      (current) =>
        current.includes(dateKey)
          ? current.filter(
              (
                currentDateKey,
              ) =>
                currentDateKey !==
                dateKey,
            )
          : [
              dateKey,
              ...current,
            ],
    );
  }

  return {
    activeCategory,
    expandedDateKeys,
    totalCount,
    categoryCounts,
    visibleCategories,
    activeGroups,
    activeCategoryLabel,
    activeCount,
    switchCategory,
    toggleDateGroup,
  };
}
