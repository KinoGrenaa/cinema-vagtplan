"use client";

import {
  Bell,
  Mail,
  Repeat,
  Users,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  readAt?: string | null;
  sender?: User | null;
};

type ShiftTrade = {
  id: number;
  type: "POOL" | "DIRECT";
  status:
    | "OPEN"
    | "ACCEPTED"
    | "REJECTED"
    | "CANCELLED";
  offeredByUserId: number;
  targetUserId?: number | null;
  offeredByUser?: User | null;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>(
    [],
  );

  const [trades, setTrades] = useState<ShiftTrade[]>(
    [],
  );

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  async function fetchData() {
    const savedUser =
      localStorage.getItem("user");

    const token =
      localStorage.getItem("token");

    if (!savedUser) return;

    const user: CurrentUser =
      JSON.parse(savedUser);

    setCurrentUser(user);

    try {
      const [messagesRes, tradesRes] =
        await Promise.all([
          fetch(
            `${API_URL}/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          ),

          fetch(`${API_URL}/shift-trades`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      const messagesData =
        await messagesRes.json();

      const tradesData =
        await tradesRes.json();

      setMessages(
        Array.isArray(messagesData)
          ? messagesData
          : [],
      );

      setTrades(
        Array.isArray(tradesData)
          ? tradesData
          : [],
      );
    } catch {
      setMessages([]);
      setTrades([]);
    }
  }

  useEffect(() => {
    fetchData();

    const interval = setInterval(
      fetchData,
      5000,
    );

    return () => clearInterval(interval);
  }, []);

  const unreadMessages = useMemo(() => {
    if (!currentUser) return [];

    return messages.filter(
      (message) => !message.readAt,
    );
  }, [messages, currentUser]);

  const directTrades = useMemo(() => {
    if (!currentUser) return [];

    return trades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId ===
          currentUser.id,
    );
  }, [trades, currentUser]);

  const poolTrades = useMemo(() => {
    if (!currentUser) return [];

    return trades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !==
          currentUser.id,
    );
  }, [trades, currentUser]);

  const totalCount =
    unreadMessages.length +
    directTrades.length +
    poolTrades.length;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed right-4 top-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-xl transition hover:scale-105 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <Bell className="h-6 w-6 text-gray-800 dark:text-gray-100" />

          {totalCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {totalCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-3 w-96 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 p-5 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Notifikationer
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {totalCount} aktive
                    notifikationer
                  </p>
                </div>

                <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
                  {totalCount}
                </span>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {unreadMessages.length >
                0 && (
                <div className="border-b border-gray-200 p-3 dark:border-gray-800">
                  <div className="mb-3 flex items-center gap-2 px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    Beskeder
                  </div>

                  <div className="space-y-2">
                    {unreadMessages.map(
                      (message) => (
                        <a
                          key={message.id}
                          href="/messages"
                          className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800"
                        >
                          <div className="font-semibold">
                            {
                              message.subject
                            }
                          </div>

                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Fra:{" "}
                            {message.sender
                              ? `${message.sender.firstName} ${message.sender.lastName}`
                              : "System"}
                          </div>
                        </a>
                      ),
                    )}
                  </div>
                </div>
              )}

              {directTrades.length > 0 && (
                <div className="border-b border-gray-200 p-3 dark:border-gray-800">
                  <div className="mb-3 flex items-center gap-2 px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    <Repeat className="h-4 w-4" />
                    Direkte vagtbytter
                  </div>

                  <div className="space-y-2">
                    {directTrades.map(
                      (trade) => (
                        <a
                          key={trade.id}
                          href="/shift-trades"
                          className="block rounded-2xl border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950/60"
                        >
                          <div className="font-semibold">
                            Direkte
                            vagtbytte
                          </div>

                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Fra{" "}
                            {trade.offeredByUser
                              ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                              : "Ukendt"}
                          </div>
                        </a>
                      ),
                    )}
                  </div>
                </div>
              )}

              {poolTrades.length > 0 && (
                <div className="p-3">
                  <div className="mb-3 flex items-center gap-2 px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    Vagtpulje
                  </div>

                  <div className="space-y-2">
                    {poolTrades.map(
                      (trade) => (
                        <a
                          key={trade.id}
                          href="/shift-trades"
                          className="block rounded-2xl border border-green-200 bg-green-50 p-4 transition hover:bg-green-100 dark:border-green-900 dark:bg-green-950/40 dark:hover:bg-green-950/60"
                        >
                          <div className="font-semibold">
                            Åben vagt
                          </div>

                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Fra{" "}
                            {trade.offeredByUser
                              ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                              : "Ukendt"}
                          </div>
                        </a>
                      ),
                    )}
                  </div>
                </div>
              )}

              {totalCount === 0 && (
                <div className="p-10 text-center">
                  <div className="mb-3 text-5xl">
                    🔔
                  </div>

                  <h3 className="text-lg font-bold">
                    Ingen notifikationer
                  </h3>

                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Du er helt opdateret.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <a
                href="/notifications"
                className="block rounded-2xl bg-black px-4 py-3 text-center font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Åbn notifikationer
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}