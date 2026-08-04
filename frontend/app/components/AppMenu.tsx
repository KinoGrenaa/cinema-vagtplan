"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

import { useRealtimeBadges } from "@/app/hooks/useRealtimeBadges";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  type CinemaModuleKey,
  useCinemaModules,
} from "@/app/providers/CinemaModulesProvider";

type MenuGroupId =
  | "schedule"
  | "time-and-leave"
  | "planning"
  | "messages"
  | "employees-and-payroll"
  | "settings"
  | "system";

type NavItem = {
  id?: MenuGroupId;
  href?: string;
  label: string;
  badge?: number;
  adminOnly?: boolean;
  masterOnly?: boolean;
  nonMasterOnly?: boolean;
  moduleKey?: CinemaModuleKey;
  moduleKeysAny?: CinemaModuleKey[];
  children?: NavItem[];
};

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const { isModuleEnabled } = useCinemaModules();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<
    Partial<Record<MenuGroupId, boolean>>
  >({});

  const totalTradeCount = poolCount + directCount;
  const scheduleBadgeCount = totalTradeCount + staffingRequestCount;
  const totalMenuBadgeCount =
    scheduleBadgeCount +
    unreadMessages +
    notificationCount +
    leaveRequestCount;

  const navItems: NavItem[] = [
    {
      href: "/home",
      label: "Startside",
      nonMasterOnly: true,
    },
    {
      href: "/dashboard",
      label: "Driftsoverblik",
    },
    { href: "/colleagues", label: "Kollegaer" },
    {
      id: "schedule",
      label: "Vagtplan",
      badge: scheduleBadgeCount,
      children: [
        {
          href: "/schedule",
          label: "Vagtplan",
          moduleKey: "SCHEDULE",
        },
        {
          href: "/live",
          label: "Live-overblik",
          adminOnly: true,
          moduleKeysAny: ["SCHEDULE", "TIME_TRACKING"],
        },
        {
          href: "/my-shifts",
          label: "Mine vagter",
          badge: directCount,
          moduleKey: "SCHEDULE",
        },
        {
          href: "/shift-trades",
          label: "Vagtpulje",
          badge: poolCount,
          moduleKey: "SHIFT_TRADES",
        },
        {
          href: "/staffing-requests",
          label: "Bemanding",
          badge: staffingRequestCount,
          moduleKey: "STAFFING_REQUESTS",
        },
      ],
    },
    {
      id: "time-and-leave",
      label: "Tid & fravær",
      badge: leaveRequestCount,
      children: [
        {
          href: "/clock",
          label: "Registrér tid",
          moduleKey: "TIME_TRACKING",
        },
        {
          href: "/my-time",
          label: "Mine timer",
          moduleKey: "TIME_TRACKING",
        },
        {
          href: "/leave-requests",
          label: "Mit fravær",
          moduleKey: "LEAVE",
        },
        {
          href: "/time-approval",
          label: "Godkend timer",
          adminOnly: true,
          moduleKey: "TIME_TRACKING",
        },
        {
          href: "/absence-calendar",
          label: "Fraværskalender",
          adminOnly: true,
          moduleKey: "LEAVE",
        },
        {
          href: "/leave-approval",
          label: "Godkend fravær",
          badge: leaveRequestCount,
          adminOnly: true,
          moduleKey: "LEAVE",
        },
      ],
    },
    {
      id: "planning",
      label: "Planlægning",
      adminOnly: true,
      children: [
        {
          href: "/shift-planning",
          label: "Vagtplanlægning",
          moduleKey: "SHIFT_PLANNING",
        },
        {
          href: "/schedule-templates",
          label: "Vagtsskabeloner",
          moduleKey: "SHIFT_PLANNING",
        },
        {
          href: "/job-functions",
          label: "Jobfunktioner",
          moduleKey: "SHIFT_PLANNING",
        },
      ],
    },
    {
      id: "messages",
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
          href: "/messages/archive",
          label: "Arkiv",
          moduleKey: "MESSAGES",
        },
      ],
    },
    {
      id: "employees-and-payroll",
      label: "Medarbejdere & løn",
      adminOnly: true,
      children: [
        {
          href: "/users",
          label: "Brugere",
        },
        {
          href: "/employee-documents",
          label: "Medarbejderdokumenter",
          moduleKey: "EMPLOYEE_DOCUMENTS",
        },
        {
          href: "/payroll",
          label: "Løn",
          moduleKey: "PAYROLL",
        },
        {
          href: "/cinema-settings/payroll-export-codes",
          label: "Eksportkoder",
          moduleKey: "PAYROLL",
        },
      ],
    },
    {
      id: "settings",
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
      ],
    },
    {
      id: "system",
      label: "System",
      adminOnly: true,
      children: [
        {
          href: "/cinema-settings",
          label: "Biografindstillinger",
        },
        {
          href: "/audit-log",
          label: "Auditlog",
        },
        {
          href: "/master",
          label: "MASTER-panel",
          masterOnly: true,
        },
        {
          href: "/system-error-logs",
          label: "Systemfejl",
          masterOnly: true,
        },
      ],
    },
  ];

  function canShowItem(item: NavItem) {
    return (
      (!item.adminOnly || isAdmin) &&
      (!item.masterOnly || isMaster) &&
      (!item.nonMasterOnly || !isMaster) &&
      (!item.moduleKey || isModuleEnabled(item.moduleKey)) &&
      (!item.moduleKeysAny ||
        item.moduleKeysAny.some((moduleKey) => isModuleEnabled(moduleKey)))
    );
  }

  const visibleNavItems = navItems
    .filter(canShowItem)
    .map((item) => ({
      ...item,
      children: item.children?.filter(canShowItem),
    }))
    .filter((item) => !item.children || item.children.length > 0);

  const visibleLinks = visibleNavItems.flatMap((item) =>
    item.children?.length ? item.children : [item],
  );
  const activeHref = visibleLinks
    .filter(
      (item): item is NavItem & { href: string } =>
        Boolean(item.href && pathMatches(pathname, item.href)),
    )
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;

  const activeGroupId = visibleNavItems.find(
    (item) =>
      item.id &&
      item.children?.some((child) => child.href === activeHref),
  )?.id;

  useEffect(() => {
    if (!open || !activeGroupId) {
      return;
    }

    setOpenGroups((current) => ({
      ...current,
      [activeGroupId]: true,
    }));
  }, [activeGroupId, open]);

  function toggleGroup(groupId: MenuGroupId) {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  function renderBadge(badge?: number, active = false) {
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

  function isGroupActive(item: NavItem) {
    return item.children?.some((child) => child.href === activeHref) ?? false;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-2xl border border-gray-800 bg-black p-3 text-white shadow-xl transition hover:scale-105 hover:bg-gray-800 active:scale-100 active:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:active:bg-gray-300 dark:focus-visible:ring-gray-300 dark:focus-visible:ring-offset-gray-950"
        aria-label="Åbn menu"
      >
        <Menu size={22} />
        {totalMenuBadgeCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
            {totalMenuBadgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-200 dark:border-gray-800 dark:bg-gray-950 ${
          open ? "translate-x-0" : "-translate-x-full"
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
                  {user.role === "MASTER"
                    ? "MASTER"
                    : user.role === "ADMIN"
                      ? "Administrator"
                      : "Medarbejder"}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-950"
            aria-label="Luk menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {visibleNavItems.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const active = item.href === activeHref;
            const groupActive = isGroupActive(item);

            if (!hasChildren && item.href) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-950 ${
                    active
                      ? "bg-black text-white shadow-sm active:bg-gray-900 dark:bg-white dark:text-black dark:active:bg-gray-200"
                      : "text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                  {renderBadge(item.badge, active)}
                </Link>
              );
            }

            if (!item.id) {
              return null;
            }

            const groupOpen = Boolean(openGroups[item.id]);
            const panelId = `app-menu-group-${item.id}`;

            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.id!)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-950 ${
                    groupActive
                      ? "bg-black text-white shadow-sm active:bg-gray-900 dark:bg-white dark:text-black dark:active:bg-gray-200"
                      : "text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                  }`}
                  aria-expanded={groupOpen}
                  aria-controls={panelId}
                >
                  <span>{item.label}</span>
                  <span className="flex items-center">
                    {renderBadge(item.badge, groupActive)}
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`ml-2 transition ${
                        groupOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>

                {groupOpen && (
                  <div
                    id={panelId}
                    className="mt-1 space-y-1 pl-3"
                  >
                    {item.children?.map((child) => {
                      if (!child.href) {
                        return null;
                      }

                      const childActive = child.href === activeHref;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-950 ${
                            childActive
                              ? "bg-gray-900 text-white active:bg-black dark:bg-white dark:text-black dark:active:bg-gray-200"
                              : "text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                          }`}
                          aria-current={childActive ? "page" : undefined}
                        >
                          {child.label}
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
            type="button"
            onClick={logout}
            className="w-full rounded-2xl bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-950"
          >
            Log ud
          </button>
        </div>
      </aside>
    </>
  );
}
