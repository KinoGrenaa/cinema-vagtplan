"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeMessages } from "../hooks/useRealtimeMessages";

type CurrentUser = {
  id: number;
  cinemaId: number;
  firstName?: string;
  lastName?: string;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
};

export default function AppMenu() {
  const [open, setOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTER";

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!token || !savedUser) return;

      const parsedUser: CurrentUser = JSON.parse(savedUser);
      setUser(parsedUser);

      if (!parsedUser?.id || !parsedUser?.cinemaId) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/unread-count?userId=${parsedUser.id}&cinemaId=${parsedUser.cinemaId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setUnreadCount(typeof data === "number" ? data : data.count || 0);
    } catch (error) {
      console.error("Kunne ikke hente unread count", error);
    }
  }, []);

  useRealtimeMessages({
    onNewMessage: fetchUnreadCount,
    onMessageRead: fetchUnreadCount,
    onMessageArchived: fetchUnreadCount,
    onMessagesUpdated: fetchUnreadCount,
    onMessageRecalled: fetchUnreadCount,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    fetchUnreadCount();
  }, [fetchUnreadCount]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-black text-xl text-white shadow-lg"
      >
        ☰
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />

          <aside className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-xl font-bold">Vagtplanssystem</h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 text-2xl"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              <MenuLink href="/dashboard" icon="🏠" label="Dashboard" onClick={() => setOpen(false)} />
              <MenuLink href="/schedule" icon="📅" label="Vagtplan" onClick={() => setOpen(false)} />
              <MenuLink href="/my-shifts" icon="⏱️" label="Mine vagter" onClick={() => setOpen(false)} />
              <MenuLink href="/profile" icon="👤" label="Profil" onClick={() => setOpen(false)} />

              {isAdmin && (
                <Dropdown
                  title="Administration"
                  open={adminOpen}
                  onToggle={() => setAdminOpen(!adminOpen)}
                >
                  <MenuLink href="/admin/users" icon="👥" label="Medarbejdere" onClick={() => setOpen(false)} />
                  <MenuLink href="/admin/work-types" icon="🎨" label="Vagttyper" onClick={() => setOpen(false)} />
                  <MenuLink href="/admin/leave-requests" icon="🌴" label="Fridagsønsker" onClick={() => setOpen(false)} />
                  <MenuLink href="/admin/time-entries" icon="🕒" label="Tidsregistrering" onClick={() => setOpen(false)} />
                  <MenuLink href="/admin/settings" icon="⚙️" label="Indstillinger" onClick={() => setOpen(false)} />
                </Dropdown>
              )}

              <Dropdown
                title="Beskeder"
                open={messagesOpen}
                onToggle={() => setMessagesOpen(!messagesOpen)}
                badge={unreadCount}
              >
                <MenuLink href="/messages" icon="💬" label="Indbakke" badge={unreadCount} onClick={() => setOpen(false)} />
                <MenuLink href="/messages/send" icon="✉️" label="Send besked" onClick={() => setOpen(false)} />
                <MenuLink href="/messages/sent" icon="📤" label="Sendte beskeder" onClick={() => setOpen(false)} />
                <MenuLink href="/messages/archive" icon="📦" label="Arkiv" onClick={() => setOpen(false)} />
              </Dropdown>
            </nav>

            <div className="border-t p-4">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-600 hover:bg-red-50"
              >
                <span>🚪</span>
                Log ud
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

type DropdownProps = {
  title: string;
  open: boolean;
  badge?: number;
  children: React.ReactNode;
  onToggle: () => void;
};

function Dropdown({
  title,
  open,
  badge,
  children,
  onToggle,
}: DropdownProps) {
  return (
    <div className="pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100"
      >
        <span>{title}</span>

        <div className="flex items-center gap-2">
          {!!badge && badge > 0 && (
            <span className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
              {badge}
            </span>
          )}

          <span>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}

type MenuLinkProps = {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  onClick?: () => void;
};

function MenuLink({ href, icon, label, badge, onClick }: MenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-gray-100 transition"
    >
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-base">{icon}</span>
        <span>{label}</span>
      </div>

      {!!badge && badge > 0 && (
        <span className="min-w-6 h-6 px-2 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}