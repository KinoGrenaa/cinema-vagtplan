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
    Indstillinger: false,
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
      label: "Indstillinger",
      children: [
        {
          href: "/settings",
          label: "Systemindstillinger",
        },
        {
          href: "/notifications",
          label: "Notifikationer",
        },
        {
          href: "/push",
          label: "Push-notifikationer",
        },
      ],
    },
    {
      label: "Administration",
      adminOnly: true,
      children: [
        {
          href: "/employees",
          label: "Medarbejdere",
        },
        {
          href: "/time-approval",
          label: "Tidsregistrering",
        },
        {
          href: "/payroll",
          label: "Løn / timer",
        },
        {
          href: "/settings",
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
        className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold shadow-sm ${
          active
            ? "bg-white text-black dark:bg-black dark:text-white"
            : "bg-red-600 text-white"
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
      <div className="fixed left-4 top-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="rounded-2xl border border-gray-800 bg-black p-3 text-white shadow-xl transition hover:scale-105 hover:bg-gray-800 dark:border-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          aria-label="Åbn menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 transform flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Cinema Vagtplan</h2>

              {user && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
              className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Luk menu"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
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
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                      : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
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
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    groupActive
                      ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                      : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
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
                  <div className="ml-4 mt-2 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-800">
                    {item.children?.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href || "#"}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm transition ${
                            childActive
                              ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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

        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl bg-red-600 py-3 font-medium text-white transition hover:bg-red-700"
          >
            Log ud
          </button>
        </div>
      </aside>
    </>
  );
}