"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type CurrentUser = {
  id: number;
  cinemaId: number;
};

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

type SystemNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<
    SystemNotification[]
  >([]);

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchData = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return;

      const user: CurrentUser = JSON.parse(savedUser);
      setCurrentUser(user);

      const [messagesResponse, tradesResponse, notificationsResponse] =
        await Promise.all([
          fetch(
            `${API_URL}/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
            { headers: getHeaders() },
          ),
          fetch(`${API_URL}/shift-trades`, {
            headers: getHeaders(),
          }),
          fetch(`${API_URL}/notifications?userId=${user.id}`, {
            headers: getHeaders(),
          }),
        ]);

      const messagesData = await messagesResponse.json();
      const tradesData = await tradesResponse.json();
      const notificationsData = await notificationsResponse.json();

      setMessages(Array.isArray(messagesData) ? messagesData : []);
      setShiftTrades(Array.isArray(tradesData) ? tradesData : []);
      setSystemNotifications(
        Array.isArray(notificationsData) ? notificationsData : [],
      );
    } catch {
      setMessages([]);
      setShiftTrades([]);
      setSystemNotifications([]);
    }
  }, []);

  async function markNotificationAsRead(id: number) {
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    await fetchData();
  }

  async function markAllNotificationsAsRead() {
    if (!currentUser) return;

    await fetch(`${API_URL}/notifications/read-all?userId=${currentUser.id}`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    await fetchData();
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeShifts({
    onShiftsUpdated: fetchData,
    onShiftTradesUpdated: fetchData,
    enableToasts: false,
  });

  const unreadMessages = useMemo(() => {
    if (!currentUser) return [];

    return messages.filter((message) => {
      const isUnread = !message.readAt;

      const isForMe =
        message.isBroadcast ||
        message.receiver?.id === currentUser.id ||
        !message.receiver;

      return isUnread && isForMe;
    });
  }, [messages, currentUser]);

  const unreadSystemNotifications = useMemo(() => {
    return systemNotifications.filter((notification) => !notification.isRead);
  }, [systemNotifications]);

  const directTrades = useMemo(() => {
    if (!currentUser) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === currentUser.id &&
        new Date(trade.shift.startTime) > new Date(),
    );
  }, [shiftTrades, currentUser]);

  const poolTrades = useMemo(() => {
    if (!currentUser) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !== currentUser.id &&
        new Date(trade.shift.startTime) > new Date(),
    );
  }, [shiftTrades, currentUser]);

  const totalCount =
    unreadMessages.length +
    unreadSystemNotifications.length +
    directTrades.length +
    poolTrades.length;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Notifikationer</h1>

              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Du har {totalCount} aktive notifikationer.
              </p>
            </div>

            {unreadSystemNotifications.length > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Marker systemnotifikationer som læst
              </button>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Systemnotifikationer</h2>

            <span className="rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold text-white">
              {unreadSystemNotifications.length}
            </span>
          </div>

          <div className="space-y-3">
            {systemNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 transition ${
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
                    <button
                      onClick={() => markNotificationAsRead(notification.id)}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700"
                    >
                      Marker som læst
                    </button>
                  )}
                </div>
              </div>
            ))}

            {systemNotifications.length === 0 && (
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
