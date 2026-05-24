"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/app/hooks/useApi";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/hooks/useNotifications";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import {
  enablePushNotifications,
  disablePushNotifications,
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

export default function NotificationsPage() {
  const { apiFetch } = useApi();
  const { user, loading: authLoading } = useAuth();

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [messages, setMessages] = useState<Message[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [pushMessage, setPushMessage] = useState("");
  const [extraLoading, setExtraLoading] = useState(true);

  const fetchExtraData = useCallback(async () => {
    if (!user) return;

    try {
      setExtraLoading(true);

      const [messagesResponse, tradesResponse] = await Promise.all([
        apiFetch(`/messages?userId=${user.id}&cinemaId=${user.cinemaId}`),
        apiFetch("/shift-trades"),
      ]);

      const [messagesData, tradesData] = await Promise.all([
        messagesResponse.ok ? messagesResponse.json() : [],
        tradesResponse.ok ? tradesResponse.json() : [],
      ]);

      setMessages(Array.isArray(messagesData) ? messagesData : []);
      setShiftTrades(Array.isArray(tradesData) ? tradesData : []);
    } catch (error) {
      console.error("Failed to load notification overview data", error);

      setMessages([]);
      setShiftTrades([]);
    } finally {
      setExtraLoading(false);
    }
  }, [apiFetch, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchExtraData();
  }, [authLoading, fetchExtraData, user]);

  useRealtimeShifts({
    onShiftsUpdated: fetchExtraData,
    onShiftTradesUpdated: fetchExtraData,
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
    const success = await enablePushNotifications();

    setPushMessage(
      success
        ? "Push-notifikationer er aktiveret."
        : "Push-notifikationer kunne ikke aktiveres.",
    );
  }

  async function handleDisablePush() {
    await disablePushNotifications();

    setPushMessage("Push-notifikationer er deaktiveret på denne browser.");
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
                  className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
                >
                  Aktivér push-notifikationer
                </button>

                <button
                  onClick={handleDisablePush}
                  className="rounded-xl bg-gray-700 px-4 py-2 text-white transition hover:bg-gray-800"
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Systemnotifikationer</h2>

            <span className="rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold text-white">
              {unreadCount}
            </span>
          </div>

          <div className="space-y-3">
            {notifications.map((notification) => (
              <a
                key={notification.id}
                href="/notifications"
                onClick={async () => {
                  if (!notification.isRead) {
                    await handleMarkNotificationAsRead(notification.id);
                  }
                }}
                className={`block rounded-2xl border p-4 transition hover:scale-[1.01] ${
                  notification.isRead
                    ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                    : "border-purple-300 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      {!notification.isRead && (
                        <span className="rounded-full bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                          Ny
                        </span>
                      )}

                      <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-white">
                        {notification.type}
                      </span>
                    </div>

                    <div className="font-bold">{notification.title}</div>

                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {notification.message}
                    </div>

                    <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(notification.createdAt).toLocaleString("da-DK")}
                    </div>
                  </div>

                  {!notification.isRead && (
                    <div className="rounded-full bg-purple-600 px-3 py-1 text-sm font-bold text-white">
                      Ny
                    </div>
                  )}
                </div>
              </a>
            ))}

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
                  {new Date(trade.shift.startTime).toLocaleString("da-DK")}
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
                  {new Date(trade.shift.startTime).toLocaleString("da-DK")}
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
    </main>
  );
}
