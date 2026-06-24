"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import { useApi } from "@/app/hooks/useApi";
import { useNotifications } from "@/app/hooks/useNotifications";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { useAuth } from "@/app/providers/AuthProvider";

import NotificationsHeader from "./components/NotificationsHeader";
import NotificationsOverview from "./components/NotificationsOverview";
import {
  getCategoryLabel,
  getErrorMessage,
  groupByDate,
  readErrorMessage,
} from "./helpers/notificationHelpers";
import type {
  ErrorDialogState,
  Message,
  NotificationCategory,
  ShiftTrade,
} from "./helpers/notificationTypes";

export default function NotificationsPage() {
  const { apiFetch } = useApi();
  const { user, loading: authLoading } = useAuth();

  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });
  const [activeCategory, setActiveCategory] =
    useState<NotificationCategory>("system");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [pushMessage, setPushMessage] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [extraLoading, setExtraLoading] = useState(true);

  const handleNotificationError = useCallback((message: string) => {
    setErrorDialog({
      open: true,
      title: "Kunne ikke opdatere notifikationer",
      description: message,
    });
  }, []);

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ onError: handleNotificationError });

  const fetchExtraData = useCallback(
    async (showError = true) => {
      if (!user) return;

      try {
        setExtraLoading(true);

        const [messagesResponse, tradesResponse] = await Promise.all([
          apiFetch("/messages"),
          apiFetch("/shift-trades"),
        ]);

        if (!messagesResponse.ok) {
          throw new Error(
            await readErrorMessage(
              messagesResponse,
              "Kunne ikke hente ulæste beskeder.",
            ),
          );
        }

        if (!tradesResponse.ok) {
          throw new Error(
            await readErrorMessage(
              tradesResponse,
              "Kunne ikke hente vagtbytter.",
            ),
          );
        }

        const [messagesData, tradesData] = await Promise.all([
          messagesResponse.json(),
          tradesResponse.json(),
        ]);

        setMessages(Array.isArray(messagesData) ? messagesData : []);
        setShiftTrades(Array.isArray(tradesData) ? tradesData : []);
      } catch (error) {
        if (showError) {
          setErrorDialog({
            open: true,
            title: "Kunne ikke hente notifikationsoversigt",
            description: getErrorMessage(
              error,
              "Der opstod en uventet fejl under hentning af notifikationsoversigten.",
            ),
          });
        }

        setMessages([]);
        setShiftTrades([]);
      } finally {
        setExtraLoading(false);
      }
    },
    [apiFetch, user],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchExtraData(true);
  }, [authLoading, fetchExtraData, user]);

  useEffect(() => {
    async function loadPushStatus() {
      try {
        const enabled = await isPushNotificationsEnabled();
        setPushEnabled(enabled);
      } catch (error) {
        setErrorDialog({
          open: true,
          title: "Kunne ikke hente push-status",
          description: getErrorMessage(
            error,
            "Der opstod en uventet fejl under hentning af push-status.",
          ),
        });
      }
    }

    loadPushStatus();
  }, []);

  const refreshExtraDataSilently = useCallback(() => {
    fetchExtraData(false);
  }, [fetchExtraData]);

  useRealtimeCore({
    onMessage: refreshExtraDataSilently,
    onShiftUpdated: refreshExtraDataSilently,
    onShiftTradeUpdated: refreshExtraDataSilently,
  });

  const unreadMessages = useMemo(() => {
    if (!user) return [];

    return messages.filter((message) => {
      const isUnread = !message.readAt;
      const isForMe =
        message.isBroadcast ||
        message.receiver?.id === user.id ||
        !message.receiver;

      return isUnread && isForMe;
    });
  }, [messages, user]);

  const directTrades = useMemo(() => {
    if (!user) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === user.id &&
        new Date(trade.shift.startTime) > new Date(),
    );
  }, [shiftTrades, user]);

  const poolTrades = useMemo(() => {
    if (!user) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !== user.id &&
        new Date(trade.shift.startTime) > new Date(),
    );
  }, [shiftTrades, user]);

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

  async function handleEnablePush() {
    try {
      setPushLoading(true);

      const success = await enablePushNotifications();
      setPushEnabled(success);

      if (!success) {
        setPushMessage("");
        setErrorDialog({
          open: true,
          title: "Push kunne ikke aktiveres",
          description:
            "Push-notifikationer kunne ikke aktiveres på denne browser.",
        });
        return;
      }

      setPushMessage("Push-notifikationer er aktiveret.");
    } catch (error) {
      setPushMessage("");
      setErrorDialog({
        open: true,
        title: "Push kunne ikke aktiveres",
        description: getErrorMessage(
          error,
          "Der opstod en uventet fejl under aktivering af push-notifikationer.",
        ),
      });
    } finally {
      setPushLoading(false);
    }
  }

  async function handleDisablePush() {
    try {
      setPushLoading(true);
      await disablePushNotifications();
      setPushEnabled(false);
      setPushMessage("Push-notifikationer er deaktiveret på denne browser.");
    } catch (error) {
      setErrorDialog({
        open: true,
        title: "Push kunne ikke deaktiveres",
        description: getErrorMessage(
          error,
          "Der opstod en uventet fejl under deaktivering af push-notifikationer.",
        ),
      });
    } finally {
      setPushLoading(false);
    }
  }

  function closeErrorDialog() {
    setErrorDialog((current) => ({
      ...current,
      open: false,
    }));
  }

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

  async function handleMarkNotificationAsRead(notificationId: number) {
    await markAsRead(notificationId);
    await loadNotifications();
  }

  async function handleMarkAllNotificationsAsRead() {
    await markAllAsRead();
    await loadNotifications();
  }

  const loading = authLoading || notificationsLoading || extraLoading;
  const activeCategoryLabel = getCategoryLabel(activeCategory);
  const activeCount =
    activeCategory === "system"
      ? notifications.length
      : categoryCounts[activeCategory];

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Indlæser notifikationer...
        <InfoModal
          open={errorDialog.open}
          title={errorDialog.title}
          description={errorDialog.description}
          variant="error"
          buttonText="OK"
          onClose={closeErrorDialog}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <NotificationsHeader
          totalCount={totalCount}
          pushLoading={pushLoading}
          pushEnabled={pushEnabled}
          pushMessage={pushMessage}
          activeCategory={activeCategory}
          unreadCount={unreadCount}
          onEnablePush={handleEnablePush}
          onDisablePush={handleDisablePush}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        />

        <NotificationsOverview
          activeCategory={activeCategory}
          activeCategoryLabel={activeCategoryLabel}
          activeCount={activeCount}
          activeGroups={activeGroups}
          categoryCounts={categoryCounts}
          expandedDateKeys={expandedDateKeys}
          notificationsCount={notifications.length}
          unreadCount={unreadCount}
          onSwitchCategory={switchCategory}
          onToggleDateGroup={toggleDateGroup}
          onMarkNotificationAsRead={handleMarkNotificationAsRead}
        />
      </div>

      <InfoModal
        open={errorDialog.open}
        title={errorDialog.title}
        description={errorDialog.description}
        variant="error"
        buttonText="OK"
        onClose={closeErrorDialog}
      />
    </main>
  );
}
