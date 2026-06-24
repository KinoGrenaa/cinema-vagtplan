"use client";

import { useEffect, useMemo, useState } from "react";

import { getCategoryLabel, groupByDate } from "../helpers/notificationHelpers";
import type { Notification } from "@/app/types/notifications";
import type {
  Message,
  NotificationCategory,
  ShiftTrade,
} from "../helpers/notificationTypes";

type UseNotificationGroupsParams = {
  notifications: Notification[];
  unreadCount: number;
  unreadMessages: Message[];
  directTrades: ShiftTrade[];
  poolTrades: ShiftTrade[];
};

export function useNotificationGroups({
  notifications,
  unreadCount,
  unreadMessages,
  directTrades,
  poolTrades,
}: UseNotificationGroupsParams) {
  const [activeCategory, setActiveCategory] =
    useState<NotificationCategory>("system");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);

  const systemGroups = useMemo(
    () =>
      groupByDate(
        notifications,
        (notification) => notification.createdAt,
        (notification) => !notification.isRead,
      ),
    [notifications],
  );

  const messageGroups = useMemo(
    () => groupByDate(unreadMessages, (message) => message.createdAt),
    [unreadMessages],
  );

  const directTradeGroups = useMemo(
    () => groupByDate(directTrades, (trade) => trade.shift.startTime),
    [directTrades],
  );

  const poolTradeGroups = useMemo(
    () => groupByDate(poolTrades, (trade) => trade.shift.startTime),
    [poolTrades],
  );

  const activeGroups = useMemo(() => {
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
  }, [
    activeCategory,
    directTradeGroups,
    messageGroups,
    poolTradeGroups,
    systemGroups,
  ]);

  useEffect(() => {
    setExpandedDateKeys((current) => {
      const validKeys = activeGroups.map((group) => group.dateKey);

      if (validKeys.length === 0) {
        return [];
      }

      const currentValidKeys = current.filter((dateKey) =>
        validKeys.includes(dateKey),
      );
      const latestDateKey = validKeys[0];
      const nextKeys = currentValidKeys.includes(latestDateKey)
        ? currentValidKeys
        : [latestDateKey, ...currentValidKeys];

      const isUnchanged =
        nextKeys.length === current.length &&
        nextKeys.every((dateKey, index) => dateKey === current[index]);

      return isUnchanged ? current : nextKeys;
    });
  }, [activeGroups]);

  const totalCount =
    unreadMessages.length +
    unreadCount +
    directTrades.length +
    poolTrades.length;

  const categoryCounts: Record<NotificationCategory, number> = {
    system: unreadCount,
    messages: unreadMessages.length,
    directTrades: directTrades.length,
    poolTrades: poolTrades.length,
  };

  const activeCategoryLabel = getCategoryLabel(activeCategory);
  const activeCount =
    activeCategory === "system"
      ? notifications.length
      : categoryCounts[activeCategory];

  function switchCategory(category: NotificationCategory) {
    setActiveCategory(category);
    setExpandedDateKeys([]);
  }

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  return {
    activeCategory,
    expandedDateKeys,
    totalCount,
    categoryCounts,
    activeGroups,
    activeCategoryLabel,
    activeCount,
    switchCategory,
    toggleDateGroup,
  };
}
