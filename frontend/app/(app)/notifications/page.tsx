"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import { useApi } from "@/app/hooks/useApi";
import { useNotifications } from "@/app/hooks/useNotifications";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { useAuth } from "@/app/providers/AuthProvider";
import type { Notification } from "@/app/types/notifications";
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type Message = {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  isBroadcast: boolean;
  sender?: User | null;
  receiver?: User | null;
};

type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  type: "POOL" | "DIRECT";
  offeredByUserId: number;
  targetUserId?: number | null;
  offeredByUser?: User | null;
  shift: {
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    };
  };
};

type ErrorDialogState = {
  open: boolean;
  title: string;
  description: string;
};

type NotificationCategory =
  | "system"
  | "messages"
  | "directTrades"
  | "poolTrades";

type DateGroup<T> = {
  dateKey: string;
  dateLabel: string;
  items: T[];
  unreadCount?: number;
};

const notificationTypeLabels: Record<Notification["type"], string> = {
  SHIFT_TRADE: "Vagtbytte",
  SHIFT_ACCEPTED: "Vagtbytte accepteret",
  SHIFT_REJECTED: "Vagtbytte afvist",
  NEW_MESSAGE: "Ny besked",
  TIME_ENTRY: "Tidsregistrering",
  STAFFING_ALERT: "Bemandsadvarsel",
  SYSTEM: "System",
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {
    // Brug fallback hvis svaret ikke er JSON.
  }

  return fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getNotificationTypeLabel(type: Notification["type"]) {
  return notificationTypeLabels[type] ?? "System";
}

function getDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ukendt";
  }

  return dateToLocalDateString(date);
}

function formatDateGroupLabel(dateKey: string) {
  if (dateKey === "ukendt") {
    return "Ukendt dato";
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return "Ukendt dato";
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  }).format(date);

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDateDK(
    date,
  )}`;
}

function formatDateTimeDK(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return `${formatDateDK(date)}, kl. ${formatTimeDK(date)}`;
}

function getUserName(user?: User | null) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`;
}

function groupByDate<T>(
  items: T[],
  getDateValue: (item: T) => string,
  getUnreadValue?: (item: T) => boolean,
): DateGroup<T>[] {
  const sortedItems = [...items].sort(
    (left, right) =>
      getTimestamp(getDateValue(right)) - getTimestamp(getDateValue(left)),
  );

  return sortedItems.reduce<DateGroup<T>[]>((groups, item) => {
    const dateKey = getDateKey(getDateValue(item));
    const existingGroup = groups.find((group) => group.dateKey === dateKey);
    const isUnread = getUnreadValue?.(item) ?? false;

    if (existingGroup) {
      existingGroup.items.push(item);

      if (isUnread) {
        existingGroup.unreadCount = (existingGroup.unreadCount ?? 0) + 1;
      }

      return groups;
    }

    groups.push({
      dateKey,
      dateLabel: formatDateGroupLabel(dateKey),
      unreadCount: isUnread ? 1 : 0,
      items: [item],
    });

    return groups;
  }, []);
}

function getCategoryLabel(category: NotificationCategory) {
  switch (category) {
    case "system":
      return "System";
    case "messages":
      return "Beskeder";
    case "directTrades":
      return "Direkte bytter";
    case "poolTrades":
      return "Vagtpulje";
  }
}

function getCategoryEmptyText(category: NotificationCategory) {
  switch (category) {
    case "system":
      return "Ingen systemnotifikationer endnu.";
    case "messages":
      return "Ingen ulæste beskeder.";
    case "directTrades":
      return "Ingen direkte vagtbytter.";
    case "poolTrades":
      return "Ingen åbne vagter i puljen.";
  }
}

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
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Notifikationer</h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Du har {totalCount} aktive notifikationer.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushLoading || pushEnabled}
                  className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pushLoading
                    ? "Arbejder..."
                    : pushEnabled
                      ? "Push er aktiveret"
                      : "Aktivér push-notifikationer"}
                </button>

                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={pushLoading || !pushEnabled}
                  className="rounded-xl bg-gray-700 px-4 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Deaktivér push-notifikationer
                </button>
              </div>

              {pushMessage && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  {pushMessage}
                </p>
              )}
            </div>

            {activeCategory === "system" && unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllNotificationsAsRead}
                className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Markér systemnotifikationer som læst
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-2 md:grid-cols-4">
            {(
              [
                "system",
                "messages",
                "directTrades",
                "poolTrades",
              ] as NotificationCategory[]
            ).map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => switchCategory(category)}
                  className={`rounded-xl px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {getCategoryLabel(category)}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        isActive
                          ? "bg-white text-gray-900 dark:bg-gray-950 dark:text-white"
                          : "bg-white text-gray-700 dark:bg-gray-950 dark:text-gray-200"
                      }`}
                    >
                      {categoryCounts[category]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            {activeCategory === "system"
              ? `Viser ${notifications.length} systemnotifikationer · ${unreadCount} ulæste`
              : `Viser ${activeCount} ${activeCategoryLabel.toLowerCase()}.`}
          </div>

          {activeCount === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              {getCategoryEmptyText(activeCategory)}
            </div>
          )}

          {activeGroups.map((group) => {
            const isExpanded = expandedDateKeys.includes(group.dateKey);

            return (
              <section
                key={group.dateKey}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
              >
                <button
                  type="button"
                  onClick={() => toggleDateGroup(group.dateKey)}
                  aria-expanded={isExpanded}
                  className="flex w-full flex-col gap-2 border-b border-gray-200 px-5 py-4 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/70 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {group.dateLabel}
                    </div>

                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {group.items.length} {activeCategoryLabel.toLowerCase()}
                      {activeCategory === "system" && group.unreadCount
                        ? ` · ${group.unreadCount} ulæste`
                        : ""}
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-950">
                    {isExpanded ? "Skjul" : "Vis"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {activeCategory === "system" &&
                      (group.items as Notification[]).map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={async () => {
                            if (!notification.isRead) {
                              await handleMarkNotificationAsRead(
                                notification.id,
                              );
                            }
                          }}
                          className={`block w-full p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/70 ${
                            notification.isRead
                              ? "bg-white dark:bg-gray-900"
                              : "bg-purple-50 dark:bg-purple-950/30"
                          }`}
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                {!notification.isRead && (
                                  <span className="rounded-full bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                                    Ny
                                  </span>
                                )}

                                <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-white">
                                  {getNotificationTypeLabel(notification.type)}
                                </span>
                              </div>

                              <div className="font-bold">
                                {notification.title}
                              </div>

                              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                {notification.message}
                              </div>
                            </div>

                            <div className="shrink-0 text-sm text-gray-400 dark:text-gray-500 md:text-right">
                              {formatDateTimeDK(notification.createdAt)}
                            </div>
                          </div>
                        </button>
                      ))}

                    {activeCategory === "messages" &&
                      (group.items as Message[]).map((message) => (
                        <a
                          key={message.id}
                          href="/messages"
                          className="block p-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                              Ulæst
                            </span>

                            {message.isBroadcast && (
                              <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                                Sendt til alle
                              </span>
                            )}
                          </div>

                          <div className="font-bold">{message.subject}</div>

                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Fra: {getUserName(message.sender) || "System"}
                          </div>

                          <div className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                            {message.body}
                          </div>

                          <div className="mt-3 text-sm text-gray-400 dark:text-gray-500">
                            {formatDateTimeDK(message.createdAt)}
                          </div>
                        </a>
                      ))}

                    {activeCategory === "directTrades" &&
                      (group.items as ShiftTrade[]).map((trade) => (
                        <a
                          key={trade.id}
                          href="/shift-trades"
                          className="block p-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                        >
                          <div className="mb-2">
                            <span className="rounded-full bg-orange-600 px-2 py-1 text-xs font-semibold text-white">
                              Direkte bytte
                            </span>
                          </div>

                          <div className="font-bold">
                            {trade.shift.workType?.name || "Vagt"}
                          </div>

                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Fra: {getUserName(trade.offeredByUser) || "Ukendt"}
                          </div>

                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {formatDateTimeDK(trade.shift.startTime)}
                          </div>
                        </a>
                      ))}

                    {activeCategory === "poolTrades" &&
                      (group.items as ShiftTrade[]).map((trade) => (
                        <a
                          key={trade.id}
                          href="/shift-trades"
                          className="block p-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/70"
                        >
                          <div className="mb-2">
                            <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white">
                              Åben vagt
                            </span>
                          </div>

                          <div className="font-bold">
                            {trade.shift.workType?.name || "Vagt"}
                          </div>

                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Fra: {getUserName(trade.offeredByUser) || "Ukendt"}
                          </div>

                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {formatDateTimeDK(trade.shift.startTime)}
                          </div>
                        </a>
                      ))}
                  </div>
                )}
              </section>
            );
          })}
        </section>
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
