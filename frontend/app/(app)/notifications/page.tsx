"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchData = useCallback(async () => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);
    setCurrentUser(user);

    const [messagesResponse, tradesResponse] = await Promise.all([
      fetch(
        `http://localhost:3001/messages?userId=${user.id}&cinemaId=${user.cinemaId}`,
        { headers: getHeaders() }
      ),
      fetch("http://localhost:3001/shift-trades", {
        headers: getHeaders(),
      }),
    ]);

    const messagesData = await messagesResponse.json();
    const tradesData = await tradesResponse.json();

    setMessages(Array.isArray(messagesData) ? messagesData : []);
    setShiftTrades(Array.isArray(tradesData) ? tradesData : []);
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
        new Date(trade.shift.startTime) > new Date()
    );
  }, [shiftTrades, currentUser]);

  const poolTrades = useMemo(() => {
    if (!currentUser) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "POOL" &&
        trade.offeredByUserId !== currentUser.id &&
        new Date(trade.shift.startTime) > new Date()
    );
  }, [shiftTrades, currentUser]);

  const totalCount =
    unreadMessages.length + directTrades.length + poolTrades.length;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">Notifikationer</h1>
        <p className="text-gray-500">
          Du har {totalCount} aktive notifikationer.
        </p>
      </div>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">
          Ulæste beskeder ({unreadMessages.length})
        </h2>

        {unreadMessages.map((message) => (
          <a
            key={message.id}
            href="/messages"
            className="block border rounded-xl p-4 hover:bg-gray-50"
          >
            <div className="font-bold">{message.subject}</div>
            <div className="text-sm text-gray-500">
              Fra:{" "}
              {message.sender
                ? `${message.sender.firstName} ${message.sender.lastName}`
                : "System"}
            </div>
            <div className="text-sm mt-2">{message.body}</div>
          </a>
        ))}

        {unreadMessages.length === 0 && (
          <p className="text-gray-500">Ingen ulæste beskeder.</p>
        )}
      </section>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">
          Direkte vagter ({directTrades.length})
        </h2>

        {directTrades.map((trade) => (
          <a
            key={trade.id}
            href="/my-shifts"
            className="block border rounded-xl p-4 hover:bg-gray-50"
          >
            <div className="font-bold">Du har fået tilbudt en vagt</div>
            <div className="text-sm text-gray-500">
              Fra:{" "}
              {trade.offeredByUser
                ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                : "Ukendt"}
            </div>
            <div className="mt-2">
              {new Date(trade.shift.startTime).toLocaleDateString("da-DK")}{" "}
              {new Date(trade.shift.startTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>{trade.shift.workType?.name}</div>
          </a>
        ))}

        {directTrades.length === 0 && (
          <p className="text-gray-500">Ingen direkte vagter.</p>
        )}
      </section>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">
          Vagtpulje ({poolTrades.length})
        </h2>

        {poolTrades.map((trade) => (
          <a
            key={trade.id}
            href="/shift-trades"
            className="block border rounded-xl p-4 hover:bg-gray-50"
          >
            <div className="font-bold">Ny vagt i vagtpuljen</div>
            <div className="text-sm text-gray-500">
              Udbydes af:{" "}
              {trade.offeredByUser
                ? `${trade.offeredByUser.firstName} ${trade.offeredByUser.lastName}`
                : "Ukendt"}
            </div>
            <div className="mt-2">
              {new Date(trade.shift.startTime).toLocaleDateString("da-DK")}{" "}
              {new Date(trade.shift.startTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>{trade.shift.workType?.name}</div>
          </a>
        ))}

        {poolTrades.length === 0 && (
          <p className="text-gray-500">Ingen vagter i vagtpuljen.</p>
        )}
      </section>
    </main>
  );
}