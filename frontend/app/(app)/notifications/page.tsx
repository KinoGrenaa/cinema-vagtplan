"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import { useApi } from "@/app/hooks/useApi";
import { useNotifications } from "@/app/hooks/useNotifications";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
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

type NotificationGroup = {
  dateKey: string;
  dateLabel: string;
  unreadCount: number;
  notifications: Notification[];
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

function getNotificationDateKey(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "ukendt";
  }

  return dateToLocalDateString(date);
}

function formatNotificationDateGroupLabel(dateKey: string) {
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

function groupNotificationsByDate(
  notifications: Notification[],
): NotificationGroup[] {
  const sortedNotifications = [...notifications].sort(
    (left, right) =>
      getTimestamp(right.createdAt) - getTimestamp(left.createdAt),
  );

  return sortedNotifications.reduce<NotificationGroup[]>(
    (groups, notification) => {
      const dateKey = getNotificationDateKey(notification.createdAt);
      const existingGroup = groups.find((group) => group.dateKey === dateKey);

      if (existingGroup) {
        existingGroup.notifications.push(notification);

        if (!notification.isRead) {
          existingGroup.unreadCount += 1;
        }

        return groups;
      }

      groups.push({
        dateKey,
        dateLabel: formatNotificationDateGroupLabel(dateKey),
        unreadCount: notification.isRead ? 0 : 1,
        notifications: [notification],
      });

      return groups;
    },
    [],
  );
}

export default function NotificationsPage() {
  const { apiFetch } = useApi();
  const { user, loading: authLoading } = useAuth();

  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    open: false,
    title: "",
    description: "",
  });

  const [expandedNotificationDateKeys, setExpandedNotificationDateKeys] =
    useState<string[]>([]);

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

  const [messages, setMessages] = useState<Message[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [pushMessage, setPushMessage] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [extraLoading, setExtraLoading] = useState(true);

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications],
  );

  useEffect(() => {
    setExpandedNotificationDateKeys((current) => {
      const validKeys = groupedNotifications.map((group) => group.dateKey);

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
  }, [groupedNotifications]);

  const fetchExtraData = useCallback(
    async (showError = true) => {
      if (!user) return;

      try {
        setExtraLoading(true);

        const [messagesResponse, tradesResponse] = await Promise.all([
          apiFetch(`/messages?userId=${user.id}&cinemaId=${user.cinemaId}`),
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

  useRealtimeShifts({
    onShiftsUpdated: refreshExtraDataSilently,
    onShiftTradesUpdated: refreshExtraDataSilently,
    enableToasts: false,
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

  const totalCount =
    unreadMessages.length +
    unreadCount +
    directTrades.length +
    poolTrades.length;

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

  function toggleNotificationDateGroup(dateKey: string) {
    setExpandedNotificationDateKeys((current) =>
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

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllNotificationsAsRead}
                className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Marker systemnotifikationer som læst
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Systemnotifikationer</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {notifications.length} i alt · {unreadCount} ulæste
              </p>
            </div>

            <span className="w-fit rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold text-white">
              {unreadCount}
            </span>
          </div>

          <div className="space-y-3">
            {groupedNotifications.map((group) => {
              const isExpanded = expandedNotificationDateKeys.includes(
                group.dateKey,
              );

              return (
                <div
                  key={group.dateKey}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                >
                  <button
                    type="button"
                    onClick={() => toggleNotificationDateGroup(group.dateKey)}
                    aria-expanded={isExpanded}
                    className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-gray-100 dark:hover:bg-gray-900 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold">{group.dateLabel}</div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {group.notifications.length} notifikationer
                        {group.unreadCount > 0
                          ? ` · ${group.unreadCount} ulæste`
                          : ""}
                      </div>
                    </div>

                    <span className="w-fit rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
                      {isExpanded ? "Skjul" : "Vis"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-gray-200 p-3 dark:border-gray-800">
                      {group.notifications.map((notification) => (
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
                          className={`block w-full rounded-2xl border p-4 text-left transition hover:scale-[1.01] ${
                            notification.isRead
                              ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                              : "border-purple-300 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40"
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

                              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                {formatDateTimeDK(notification.createdAt)}
                              </div>
                            </div>

                            {!notification.isRead && (
                              <div className="w-fit rounded-full bg-purple-600 px-3 py-1 text-sm font-bold text-white">
                                Ny
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {notifications.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">
                Ingen systemnotifikationer endnu.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Ulæste beskeder</h2>

            <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
              {unreadMessages.length}
            </span>
          </div>

          <div className="space-y-3">
            {unreadMessages.map((message) => (
              <a
                key={message.id}
                href="/messages"
                className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
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
                  Fra:{" "}
                  {message.sender
                    ? `${message.sender.firstName} ${message.sender.lastName}`
                    : "System"}
                </div>

                <div className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                  {message.body}
                </div>
              </a>
            ))}

            {unreadMessages.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">
                Ingen ulæste beskeder.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Direkte vagtbytter</h2>

            <span className="rounded-full bg-orange-600 px-3 py-1 text-sm font-semibold text-white">
              {directTrades.length}
            </span>
          </div>

          <div className="space-y-3">
            {directTrades.map((trade) => (
              <a
                key={trade.id}
                href="/shift-trades"
                className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
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
                  Fra:{" "}
                  {trade.offeredByUser
                    ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                    : "Ukendt"}
                </div>

                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {formatDateTimeDK(trade.shift.startTime)}
                </div>
              </a>
            ))}

            {directTrades.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">
                Ingen direkte vagtbytter.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Vagtpulje</h2>

            <span className="rounded-full bg-green-600 px-3 py-1 text-sm font-semibold text-white">
              {poolTrades.length}
            </span>
          </div>

          <div className="space-y-3">
            {poolTrades.map((trade) => (
              <a
                key={trade.id}
                href="/shift-trades"
                className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
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
                  Fra:{" "}
                  {trade.offeredByUser
                    ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                    : "Ukendt"}
                </div>

                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {formatDateTimeDK(trade.shift.startTime)}
                </div>
              </a>
            ))}

            {poolTrades.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">
                Ingen åbne vagter i puljen.
              </div>
            )}
          </div>
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
