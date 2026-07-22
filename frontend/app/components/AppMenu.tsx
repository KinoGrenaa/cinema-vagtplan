"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useRealtimeBadges } from "@/app/hooks/useRealtimeBadges";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  type CinemaModuleKey,
  useCinemaModules,
} from "@/app/providers/CinemaModulesProvider";

type NavItem = {
  href?: string;
  label: string;
  badge?: number;
  adminOnly?: boolean;
  moduleKey?: CinemaModuleKey;
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
  const {
    user,
    logout,
    isAdmin,
    isMaster,
  } = useAuth();
  const {
    isModuleEnabled,
  } = useCinemaModules();
  const [open, setOpen] =
    useState(false);
  const [
    openGroups,
    setOpenGroups,
  ] = useState<
    Record<string, boolean>
  >({
    Vagtplan: true,
    Beskeder: false,
    Indstillinger: false,
    Administration: false,
  });

  function toggleGroup(
    label: string,
  ) {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  }

  const totalTradeCount =
    poolCount + directCount;
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
          moduleKey: "SCHEDULE",
        },
        {
          href: "/shift-planning",
          label:
            "Vagtplanlægning",
          adminOnly: true,
          moduleKey:
            "SHIFT_PLANNING",
        },
        {
          href:
            "/schedule-templates",
          label: "Vagtsskabeloner",
          adminOnly: true,
          moduleKey:
            "SHIFT_PLANNING",
        },
        {
          href: "/day-periods",
          label: "Dagsperioder",
          adminOnly: true,
          moduleKey:
            "SHIFT_PLANNING",
        },
        {
          href: "/job-functions",
          label: "Jobfunktioner",
          adminOnly: true,
          moduleKey:
            "SHIFT_PLANNING",
        },
        {
          href: "/my-shifts",
          label: "Mine vagter",
          badge: directCount,
          moduleKey: "SCHEDULE",
        },
        {
          href: "/my-time",
          label: "Mine timer",
          moduleKey:
            "TIME_TRACKING",
        },
        {
          href: "/shift-trades",
          label: "Vagtpulje",
          badge: poolCount,
          moduleKey:
            "SHIFT_TRADES",
        },
        {
          href: "/leave-requests",
          label: "Mit fravær",
          moduleKey: "LEAVE",
        },
        {
          href:
            "/staffing-requests",
          label: "Staffing",
          badge:
            staffingRequestCount,
          moduleKey:
            "STAFFING_REQUESTS",
        },
      ],
    },
    {
      label: "Beskeder",
      badge: unreadMessages,
      moduleKey: "MESSAGES",
      children: [
        {
          href: "/messages",
          label: "Indbakke",
          badge: unreadMessages,
          moduleKey: "MESSAGES",
        },
        {
          href: "/messages/send",
          label: "Send besked",
          moduleKey: "MESSAGES",
        },
        {
          href: "/messages/sent",
          label: "Sendte beskeder",
          moduleKey: "MESSAGES",
        },
        {
          href:
            "/messages/archive",
          label: "Arkiv",
          moduleKey: "MESSAGES",
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
          label:
            "Brugerindstillinger",
        },
        {
          href: "/notifications",
          label: "Notifikationer",
          badge:
            notificationCount,
        },
        {
          href: "/push",
          label:
            "Push-notifikationer",
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
          href:
            "/employee-documents",
          label:
            "Medarbejderdokumenter",
          moduleKey:
            "EMPLOYEE_DOCUMENTS",
        },
        {
          href: "/time-approval",
          label:
            "Tidsregistrering",
          moduleKey:
            "TIME_TRACKING",
        },
        {
          href: "/leave-approval",
          label:
            "Fraværsgodkendelse",
          badge: leaveRequestCount,
          moduleKey: "LEAVE",
        },
        {
          href: "/payroll",
          label: "Løn / timer",
          moduleKey: "PAYROLL",
        },
        {
          href:
            "/cinema-settings",
          label:
            "Biograf indstillinger",
        },
        {
          href: "/audit-log",
          label: "Audit log",
        },
        {
          href:
            "/cinema-settings/payroll-types",
          label: "Løn setup",
          moduleKey: "PAYROLL",
        },
        ...(isMaster
          ? [
              {
                href: "/master",
                label:
                  "Master panel",
              },
            ]
          : []),
      ],
    },
  ];

  function canShowItem(
    item: NavItem,
  ) {
    return (
      (!item.adminOnly ||
        isAdmin) &&
      (!item.moduleKey ||
        isModuleEnabled(
          item.moduleKey,
        ))
    );
  }

  const visibleNavItems = navItems
    .filter(canShowItem)
    .map((item) => ({
      ...item,
      children:
        item.children?.filter(
          canShowItem,
        ),
    }))
    .filter(
      (item) =>
        !item.children ||
        item.children.length > 0,
    );

  function renderBadge(
    badge?: number,
    active = false,
  ) {
    if (!badge || badge <= 0) {
      return null;
    }

    return (
      <span
        className={`ml-3 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
          active
            ? "bg-white text-black dark:bg-black dark:text-white"
            : "bg-red-600 text-white"
        }`}
      >
        {badge}
      </span>
    );
  }

  function isGroupActive(
    item: NavItem,
  ) {
    return (
      item.children?.some(
        (child) =>
          child.href === pathname,
      ) ?? false
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-2xl border border-gray-800 bg-black p-3 text-white shadow-xl transition hover:scale-105 hover:bg-gray-800 dark:border-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        aria-label="Åbn menu"
      >
        <Menu size={22} />
        {totalMenuBadgeCount >
          0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
            {totalMenuBadgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() =>
            setOpen(false)
          }
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-200 dark:border-gray-800 dark:bg-gray-950 ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">
              Cinema Vagtplan
            </h2>

            {user && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                    user.email ||
                    "Bruger"}
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {user.role ===
                  "MASTER"
                    ? "Master"
                    : user.role ===
                        "ADMIN"
                      ? "Administrator"
                      : "Medarbejder"}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Luk menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {visibleNavItems.map(
            (item) => {
              const hasChildren =
                Boolean(
                  item.children
                    ?.length,
                );
              const active =
                item.href ===
                pathname;
              const groupActive =
                isGroupActive(item);
              const groupOpen =
                openGroups[
                  item.label
                ] || groupActive;

              if (
                !hasChildren &&
                item.href
              ) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setOpen(false)
                    }
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                        : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.label}
                    {renderBadge(
                      item.badge,
                      active,
                    )}
                  </Link>
                );
              }

              return (
                <div
                  key={item.label}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleGroup(
                        item.label,
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      groupActive
                        ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                        : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span>
                      {item.label}
                    </span>
                    <span className="flex items-center">
                      {renderBadge(
                        item.badge,
                        groupActive,
                      )}
                      <ChevronDown
                        size={18}
                        className={`ml-2 transition ${
                          groupOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </span>
                  </button>

                  {groupOpen && (
                    <div className="mt-1 space-y-1 pl-3">
                      {item.children?.map(
                        (child) => {
                          if (
                            !child.href
                          ) {
                            return null;
                          }

                          const childActive =
                            child.href ===
                            pathname;

                          return (
                            <Link
                              key={
                                child.href
                              }
                              href={
                                child.href
                              }
                              onClick={() =>
                                setOpen(
                                  false,
                                )
                              }
                              className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm transition ${
                                childActive
                                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                              }`}
                            >
                              {
                                child.label
                              }
                              {renderBadge(
                                child.badge,
                                childActive,
                              )}
                            </Link>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </nav>

        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
          >
            Log ud
          </button>
        </div>
      </aside>
    </>
  );
}
