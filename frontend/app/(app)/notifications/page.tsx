"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

export default function NotificationsPage() {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);

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

      const [messagesResponse, tradesResponse] =
        await Promise.all([
          fetch(
            `${API_URL}/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
            {
              headers: getHeaders(),
            },
          ),

          fetch(`${API_URL}/shift-trades`, {
            headers: getHeaders(),
          }),
        ]);

      const messagesData = await messagesResponse.json();

      const tradesData = await tradesResponse.json();

      setMessages(Array.isArray(messagesData) ? messagesData : []);

      setShiftTrades(Array.isArray(tradesData) ? tradesData : []);
    } catch {
      setMessages([]);
      setShiftTrades([]);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [fetchData]);

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
    directTrades.length +
    poolTrades.length;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Notifikationer</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Du har {totalCount} aktive notifikationer.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Ulæste beskeder
            </h2>

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

                <div className="font-bold">
                  {message.subject}
                </div>

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
            <h2 className="text-xl font-bold">
              Direkte vagtbytter
            </h2>

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
                  {new Date(
                    trade.shift.startTime,
                  ).toLocaleString("da-DK")}
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
            <h2 className="text-xl font-bold">
              Vagtpulje
            </h2>

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
                  {new Date(
                    trade.shift.startTime,
                  ).toLocaleString("da-DK")}
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