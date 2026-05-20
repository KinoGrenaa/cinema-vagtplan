"use client";

import { useEffect, useState } from "react";

type CurrentUser = {
  id: number;
  cinemaId: number;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
};

export default function AppMenu() {
  const [open, setOpen] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);

  const [systemOpen, setSystemOpen] = useState(false);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

  const [poolCount, setPoolCount] = useState(0);

  const [directCount, setDirectCount] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  async function fetchUnreadCount() {
    const savedUser = localStorage.getItem("user");

    const token = localStorage.getItem("token");

    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    if (!user?.id || !user?.cinemaId) return;

    const response = await fetch(
      `http://localhost:3001/messages/unread-count?userId=${user.id}&cinemaId=${user.cinemaId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    setUnreadCount(data.count || 0);
  }

  async function fetchPoolCount() {
    const savedUser = localStorage.getItem("user");

    const token = localStorage.getItem("token");

    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    if (!user?.cinemaId || !user?.id) return;

    const response = await fetch(
      `http://localhost:3001/shift-trades/pool-count?cinemaId=${user.cinemaId}&userId=${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    setPoolCount(data.count || 0);
  }

  async function fetchDirectCount() {
    const savedUser = localStorage.getItem("user");

    const token = localStorage.getItem("token");

    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    if (!user?.cinemaId || !user?.id) return;

    const response = await fetch(
      `http://localhost:3001/shift-trades/direct-count?cinemaId=${user.cinemaId}&userId=${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    setDirectCount(data.count || 0);
  }

  useEffect(() => {
    fetchUnreadCount();

    fetchPoolCount();

    fetchDirectCount();

    const interval = setInterval(() => {
      fetchUnreadCount();

      fetchPoolCount();

      fetchDirectCount();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  function logout() {
    localStorage.clear();

    window.location.href = "/";
  }

  const mainLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
    },

    {
      href: "/my-shifts",
      label: "Mine vagter",
    },

    {
      href: "/schedule",
      label: "Vagtplan",
    },

    {
      href: "/shift-trades",
      label: "Vagtpulje",
    },

    {
      href: "/colleagues",
      label: "Kollegaer",
    },

    {
      href: "/messages",
      label: "Beskeder",
    },
  ];

  const adminLinks = [
    {
      href: "/employees",
      label: "Medarbejdere",
    },

    {
      href: "/time-approval",
      label: "Godkend timer",
    },

    {
      href: "/absence-calendar",
      label: "Fraværskalender",
    },

    {
      href: "/payroll",
      label: "Løn-export",
    },

    {
      href: "/clock",
      label: "Clock ind/ud",
    },
  ];

  const systemLinks = [
    {
      href: "/profile",
      label: "Min profil",
    },

    {
      href: "/push",
      label: "Notifikationer",
    },

    {
      href: "/live",
      label: "Live drift",
    },
  ];

  function getBadgeCount(href: string) {
    if (href === "/messages") return unreadCount;

    if (href === "/shift-trades") return poolCount;

    if (href === "/my-shifts") return directCount;

    return 0;
  }

  function renderLinks(
    links: {
      href: string;
      label: string;
    }[]
  ) {
    return links.map((link) => {
      const badgeCount = getBadgeCount(link.href);

      return (
        <a
          key={link.href}
          href={link.href}
          className="relative px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
        >
          {link.label}

          {badgeCount > 0 && (
            <span className="absolute top-1 right-2 bg-red-600 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {badgeCount}
            </span>
          )}
        </a>
      );
    });
  }

  const isAdmin =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "MASTER";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          ☰
        </button>

        {open && (
          <div className="relative z-50 mt-2 bg-white shadow-xl rounded-2xl p-3 flex flex-col gap-2 min-w-64 max-h-[80vh] overflow-y-auto border">
            <div className="flex flex-col">
              <p className="text-xs uppercase text-gray-500 px-3 mb-1">
                Hovedmenu
              </p>

              {renderLinks(mainLinks)}
            </div>

            {isAdmin && (
              <div className="border-t pt-2">
                <button
                  onClick={() =>
                    setAdminOpen(!adminOpen)
                  }
                  className="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-semibold"
                >
                  <span>Administration</span>

                  <span>
                    {adminOpen ? "▲" : "▼"}
                  </span>
                </button>

                {adminOpen && (
                  <div className="flex flex-col pl-2">
                    {renderLinks(adminLinks)}
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-2">
              <button
                onClick={() =>
                  setSystemOpen(!systemOpen)
                }
                className="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-semibold"
              >
                <span>System</span>

                <span>
                  {systemOpen ? "▲" : "▼"}
                </span>
              </button>

              {systemOpen && (
                <div className="flex flex-col pl-2">
                  {renderLinks(systemLinks)}
                </div>
              )}
            </div>

            <div className="border-t pt-2">
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm font-medium"
              >
                Log ud
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}