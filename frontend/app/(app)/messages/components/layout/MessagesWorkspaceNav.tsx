"use client";

import Link from "next/link";
import {
  Bell,
  Inbox,
  Send,
  SquarePen,
  Trash2,
} from "lucide-react";

type MessagesWorkspaceNavProps = {
  active:
    | "inbox"
    | "new"
    | "sent"
    | "deleted"
    | "notifications";
  unreadCount?: number;
};

const items = [
  {
    id: "inbox",
    href: "/messages",
    label: "Indbakke",
    icon: Inbox,
  },
  {
    id: "new",
    href: "/messages/new",
    label: "Ny besked",
    icon: SquarePen,
  },
  {
    id: "sent",
    href: "/messages/sent",
    label: "Sendt",
    icon: Send,
  },
  {
    id: "deleted",
    href: "/messages/deleted",
    label: "Slettet",
    icon: Trash2,
  },
  {
    id: "notifications",
    href: "/messages/notifications",
    label: "Notifikationer",
    icon: Bell,
  },
] as const;

export default function MessagesWorkspaceNav({
  active,
  unreadCount = 0,
}: MessagesWorkspaceNavProps) {
  return (
    <aside className="border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-950/50 lg:border-b-0 lg:border-r lg:p-4">
      <div className="mb-3 hidden px-3 lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Beskeder
        </p>
      </div>

      <nav
        className="grid grid-cols-5 gap-2 lg:block lg:space-y-1"
        aria-label="Beskedmapper"
      >
        {items.map((item) => {
          const Icon =
            item.icon;
          const selected =
            item.id ===
            active;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={
                selected
                  ? "page"
                  : undefined
              }
              className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:justify-start ${
                selected
                  ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                  : "text-slate-700 hover:bg-slate-200/70 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700"
              }`}
            >
              <Icon
                size={18}
                aria-hidden="true"
                className="shrink-0"
              />
              <span className="truncate">
                {item.label}
              </span>

              {item.id ===
                "inbox" &&
                unreadCount >
                  0 && (
                  <span
                    className={`ml-auto hidden min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold lg:inline-flex ${
                      selected
                        ? "bg-white text-blue-700"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
