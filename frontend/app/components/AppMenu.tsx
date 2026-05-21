"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type User = {
  id: number;
  role: string;
  cinemaId: number;
};

export default function AppMenu() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [poolCount, setPoolCount] = useState(0);
  const [directCount, setDirectCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    setUser(JSON.parse(savedUser));
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!savedUser || !token) return;

      const parsedUser = JSON.parse(savedUser);

      if (!parsedUser?.id || !parsedUser?.cinemaId) return;

      const response = await fetch(
        `${API_URL}/messages/unread-count?userId=${parsedUser.id}&cinemaId=${parsedUser.cinemaId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();

      setUnreadCount(data.count ?? 0);
    } catch (error) {
      console.error("Unread count fejl:", error);
      setUnreadCount(0);
    }
  }, []);

  const fetchPoolCount = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!savedUser || !token) return;

      const parsedUser = JSON.parse(savedUser);

      const response = await fetch(
        `${API_URL}/shift-trades/pool-count?cinemaId=${parsedUser.cinemaId}&userId=${parsedUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();

      setPoolCount(data.count ?? 0);
    } catch (error) {
      console.error("Pool count fejl:", error);
      setPoolCount(0);
    }
  }, []);

  const fetchDirectCount = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!savedUser || !token) return;

      const parsedUser = JSON.parse(savedUser);

      const response = await fetch(
        `${API_URL}/shift-trades/direct-count?cinemaId=${parsedUser.cinemaId}&userId=${parsedUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();

      setDirectCount(data.count ?? 0);
    } catch (error) {
      console.error("Direct count fejl:", error);
      setDirectCount(0);
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    await Promise.all([
    fetchPoolCount(),
    fetchDirectCount(),
    ]);
    }, [fetchUnreadCount, fetchPoolCount, fetchDirectCount]);

    useEffect(() => {
    refreshCounts();

    const interval = setInterval(() => {
      refreshCounts();
    }, 15000);

    return () => clearInterval(interval);
   }, [refreshCounts]);

    function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/";
    }

    const totalTradeCount = poolCount + directCount;

    const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
    },
    {
      href: "/schedule",
      label: "Vagtplan",
    },
    {
      href: "/my-shifts",
      label: "Mine vagter",
    },
    {
      href: "/shift-trades",
      label: "Vagtpulje",
      badge: totalTradeCount,
    },
    {
      href: "/messages",
      label: "Beskeder",
      badge: 0,
    },
  ];

  if (user?.role === "ADMIN" || user?.role === "MASTER") {
    navItems.push(
      {
        href: "/users",
        label: "Brugere",
      },
      {
        href: "/work-types",
        label: "Vagttyper",
      },
      {
        href: "/leave-requests/admin",
        label: "Fravær",
      },
    );
  }

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="bg-black text-white p-2 rounded-lg shadow-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:h-auto`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Cinema Vagtplan</h2>

            {user && (
              <p className="text-sm text-gray-500">
                {user.role === "MASTER"
                  ? "Master"
                  : user.role === "ADMIN"
                    ? "Administrator"
                    : "Medarbejder"}
              </p>
            )}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition
                  ${
                    active
                      ? "bg-black text-white"
                      : "hover:bg-gray-100 text-gray-800"
                  }`}
              >
                <span>{item.label}</span>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`min-w-6 h-6 px-2 flex items-center justify-center text-xs rounded-full font-bold
                      ${
                        active
                          ? "bg-white text-black"
                          : "bg-red-600 text-white"
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition"
          >
            Log ud
          </button>
        </div>
      </aside>
    </>
  );
}