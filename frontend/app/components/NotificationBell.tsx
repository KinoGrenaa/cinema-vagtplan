"use client";

import { useEffect, useMemo, useState } from "react";

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
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  offeredByUserId: number;
  targetUserId?: number | null;
  offeredByUser?: User | null;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);

  const [trades, setTrades] = useState<ShiftTrade[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  async function fetchData() {
    const savedUser = localStorage.getItem("user");

    const token = localStorage.getItem("token");

    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    setCurrentUser(user);

    const [messagesRes, tradesRes] = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ),

      fetch(
        "${process.env.NEXT_PUBLIC_API_URL}/shift-trades",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ),
    ]);

    const messagesData = await messagesRes.json();

    const tradesData = await tradesRes.json();

    setMessages(
      Array.isArray(messagesData)
        ? messagesData
        : []
    );

    setTrades(
      Array.isArray(tradesData)
        ? tradesData
        : []
    );
  }

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  const unreadMessages = useMemo(() => {
    if (!currentUser) return [];

    return messages.filter(
      (message) => !message.readAt
    );
  }, [messages, currentUser]);

  const directTrades = useMemo(() => {
    if (!currentUser) return [];

    return trades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === currentUser.id
    );
  }, [trades, currentUser]);

  const poolTrades = useMemo(() => {
    if (!currentUser) return [];

    return trades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !== currentUser.id
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

      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="relative bg-white border shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-2xl hover:bg-gray-100"
        >
          🔔

          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {totalCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-white border rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold text-lg">
                Notifikationer
              </h2>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {unreadMessages.map((message) => (
                <a
                  key={message.id}
                  href="/messages"
                  className="block p-4 hover:bg-gray-50 border-b"
                >
                  <div className="font-semibold text-sm">
                    Ny besked
                  </div>

                  <div className="text-sm text-gray-600">
                    {message.subject}
                  </div>
                </a>
              ))}

              {directTrades.map((trade) => (
                <a
                  key={trade.id}
                  href="/my-shifts"
                  className="block p-4 hover:bg-gray-50 border-b"
                >
                  <div className="font-semibold text-sm">
                    Direkte vagt tilbudt
                  </div>

                  <div className="text-sm text-gray-600">
                    {trade.offeredByUser
                      ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                      : "Kollega"}
                  </div>
                </a>
              ))}

              {poolTrades.map((trade) => (
                <a
                  key={trade.id}
                  href="/shift-trades"
                  className="block p-4 hover:bg-gray-50 border-b"
                >
                  <div className="font-semibold text-sm">
                    Ny vagt i puljen
                  </div>

                  <div className="text-sm text-gray-600">
                    {trade.offeredByUser
                      ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                      : "Kollega"}
                  </div>
                </a>
              ))}

              {totalCount === 0 && (
                <div className="p-6 text-center text-gray-500">
                  Ingen nye notifikationer
                </div>
              )}
            </div>

            <a
              href="/notifications"
              className="block p-4 text-center font-medium hover:bg-gray-50 border-t"
            >
              Se alle notifikationer
            </a>
          </div>
        )}
      </div>
    </>
  );
}