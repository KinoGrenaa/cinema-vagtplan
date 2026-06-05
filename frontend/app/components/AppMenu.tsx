"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRealtimeBadges } from "@/app/hooks/useRealtimeBadges";
import { useAuth } from "@/app/providers/AuthProvider";

type NavItem = {
  href?: string;
  label: string;
  badge?: number;
  adminOnly?: boolean;
  children?: NavItem[];
};

export default function AppMenu() {
  const pathname = usePathname();

  const {
    poolCount,
    directCount,
    unreadMessages,
    notificationCount,
    staffingRequestCount,
    leaveRequestCount,
  } = useRealtimeBadges();

  const { user, logout, isAdmin, isMaster } = useAuth();

  const [open, setOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Vagtplan: true,
    Beskeder: false,
    Indstillinger: false,
    Administration: false,
  });

  function toggleGroup(label: string) {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  }

  const totalTradeCount = poolCount + directCount;

  const totalMenuBadgeCount =
    totalTradeCount +
    unreadMessages +
    notificationCount +
    staffingRequestCount +
    leaveRequestCount;

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
    },

    {
      label: "Vagtplan",
      badge: totalTradeCount,

      children: [
        {
          href: "/schedule",
          label: "Vagtplan",
        },

        {
          href: "/my-shifts",
          label: "Mine vagter",
          badge: directCount,
        },

        {
          href: "/my-time",
          label: "Mine timer",
        },

        {
          href: "/shift-trades",
          label: "Vagtpulje",
          badge: poolCount,
        },

        {
          href: "/leave-requests",
          label: "Mit fravær",
        },

        {
          href: "/staffing-requests",
          label: "Staffing",
          badge: staffingRequestCount,
        },
      ],
    },

    {
      label: "Beskeder",
      badge: unreadMessages,

      children: [
        {
          href: "/messages",
          label: "Indbakke",
          badge: unreadMessages,
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
      badge: notificationCount,

      children: [
        {
          href: "/profile",
          label: "Min profil",
        },
        {
          href: "/settings",
          label: "Brugerindstillinger",
        },

        {
          href: "/notifications",
          label: "Notifikationer",
          badge: notificationCount,
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
      badge: leaveRequestCount,

      children: [
        {
          href: "/users",
          label: "Brugere",
        },

        {
          href: "/employees",
          label: "Medarbejdere",
        },

        {
          href: "/employee-documents",
          label: "Medarbejderdokumenter",
        },

        {
          href: "/time-approval",
          label: "Tidsregistrering",
        },

        {
          href: "/leave-approval",
          label: "Fraværsgodkendelse",
          badge: leaveRequestCount,
        },

        {
          href: "/payroll",
          label: "Løn / timer",
        },

        {
          href: "/cinema-settings",
          label: "Biograf indstillinger",
        },

        {
          href: "/audit-log",
          label: "Audit log",
        },

        {
          href: "/cinema-settings/payroll-types",
          label: "Løn setup",
        },

        ...(isMaster
          ? [
              {
                href: "/master",
                label: "Master panel",
              },
            ]
          : []),
      ],
    },
  ];

  const visibleNavItems = navItems
    .filter((item) => !item.adminOnly || isAdmin)
    .map((item) => ({
      ...item,

      children: item.children?.filter((child) => !child.adminOnly || isAdmin),
    }));

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
          className="relative rounded-2xl border border-gray-800 bg-black p-3 text-white shadow-xl transition hover:scale-105 hover:bg-gray-800 dark:border-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          aria-label="Åbn menu"
        >
          <Menu size={24} />

          {totalMenuBadgeCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white shadow">
              {totalMenuBadgeCount}
            </span>
          )}
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
                <div className="mt-2">
                  <p className="text-sm font-medium">
                    {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                      user.email ||
                      "Bruger"}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role === "MASTER"
                      ? "Master"
                      : user.role === "ADMIN"
                        ? "Administrator"
                        : "Medarbejder"}
                  </p>
                </div>
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
                  <span className="flex items-center gap-2">
                    {item.label}

                    {renderBadge(item.badge, groupActive)}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      groupOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {groupOpen && (
                  <div className="mt-2 space-y-1 pl-3">
                    {item.children?.map((child) => {
                      if (!child.href) return null;

                      const childActive = child.href === pathname;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm transition ${
                            childActive
                              ? "bg-gray-900 text-white dark:bg-white dark:text-black"
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
            onClick={logout}
            className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Log ud
          </button>
        </div>
      </aside>
    </>
  );
}
