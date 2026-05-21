"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type User = {
  id: number;
  role: string;
  cinemaId: number;
};

type NavItem = {
  href?: string;
  label: string;
  badge?: number;
  adminOnly?: boolean;
  children?: NavItem[];
};

export default function AppMenu() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Vagtplan: true,
    Beskeder: false,
    Administration: false,
  });

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
    } catch {
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
    } catch {
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
    } catch {
      setDirectCount(0);
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    await Promise.all([
      fetchUnreadCount(),
      fetchPoolCount(),
      fetchDirectCount(),
    ]);
  }, [fetchUnreadCount, fetchPoolCount, fetchDirectCount]);

  useEffect(() => {
    refreshCounts();

    const interval = setInterval(refreshCounts, 15000);

    return () => clearInterval(interval);
  }, [refreshCounts]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  function toggleGroup(label: string) {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  }

  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTER";
  const totalTradeCount = poolCount + directCount;

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
    },
    {
      label: "Vagtplan",
      children: [
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
          href: "/leave-requests",
          label: "Mit fravær",
        },
      ],
    },
    {
      label: "Beskeder",
      badge: unreadCount,
      children: [
        {
          href: "/messages",
          label: "Indbakke",
          badge: unreadCount,
        },
        {
          href: "/messages/send",
          label: "Send besked",
        },
        {
          href: "/messages/sent",
          label: "Sendte beskeder",
        },
        {
          href: "/messages/archive",
          label: "Arkiv",
        },
      ],
    },
    {
      label: "Administration",
      adminOnly: true,
      children: [
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
          label: "Fraværsgodkendelse",
        },
        {
          href: "/time-entries",
          label: "Tidsregistrering",
        },
        {
          href: "/payroll",
          label: "Løn / timer",
        },
        {
          href: "/cinema-settings",
          label: "Biograf indstillinger",
        },
      ],
    },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  function renderBadge(badge?: number, active = false) {
    if (!badge || badge <= 0) return null;

    return (
      <span
        className={`min-w-6 h-6 px-2 flex items-center justify-center text-xs rounded-full font-bold ${
          active ? "bg-white text-black" : "bg-red-600 text-white"
        }`}
      >
        {badge}
      </span>
    );
  }

  function isGroupActive(item: NavItem) {
    return item.children?.some((child) => child.href === pathname) ?? false;
  }

  return (
    <>
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="bg-black text-white p-2 rounded-lg shadow-lg"
          aria-label="Åbn menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col
        ${open ? "translate-x-0" : "-translate-x-full"}`}
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
            className="text-gray-600"
            aria-label="Luk menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const active = item.href === pathname;
            const groupActive = isGroupActive(item);
            const groupOpen = openGroups[item.label] || groupActive;

            if (!hasChildren && item.href) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition ${
                    active
                      ? "bg-black text-white"
                      : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  <span>{item.label}</span>
                  {renderBadge(item.badge, active)}
                </Link>
              );
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                    groupActive
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  <span>{item.label}</span>

                  <span className="flex items-center gap-2">
                    {renderBadge(item.badge, groupActive)}
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${
                        groupOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>

                {groupOpen && (
                  <div className="mt-2 ml-3 pl-3 border-l space-y-1">
                    {item.children?.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href || "#"}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
                            childActive
                              ? "bg-black text-white"
                              : "hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <span>{child.label}</span>
                          {renderBadge(child.badge, childActive)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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