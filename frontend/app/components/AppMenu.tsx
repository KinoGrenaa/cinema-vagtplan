"use client";

import { useEffect, useState } from "react";

type CurrentUser = {
  id: number;
  cinemaId: number;
};

export default function AppMenu() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 5000);

    return () => clearInterval(interval);
  }, []);

  function logout() {
    localStorage.clear();
    window.location.href = "/";
  }

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/my-shifts", label: "Mine vagter" },
    { href: "/schedule", label: "Vagtplan" },
    { href: "/shift-trades", label: "Vagtpulje" },
    { href: "/leave-requests", label: "Fridag" },
    { href: "/colleagues", label: "Kollegaer" },
    { href: "/messages", label: "Beskeder" },
    { href: "/clock", label: "Clock ind/ud" },
    { href: "/live", label: "Live drift" },
    { href: "/payroll", label: "Løn-export" },
    { href: "/push", label: "Notifikationer" },
    { href: "/employees", label: "Medarbejdere" },
    { href: "/profile", label: "Min profil" },
    { href: "/absence-calendar", label: "Fraværskalender" },
    { href: "/time-approval", label: "Godkend timer" },
  ];

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="bg-black text-white px-4 py-2 rounded-lg"
      >
        ☰
      </button>

      {open && (
        <div className="mt-2 bg-white shadow-xl rounded-xl p-3 flex flex-col gap-2 min-w-56 border">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              {link.label}

              {link.href === "/messages" && unreadCount > 0 && (
                <span className="absolute top-1 right-2 bg-red-600 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </a>
          ))}

          <button
            onClick={logout}
            className="text-left px-3 py-2 rounded-lg hover:bg-red-100 text-red-600"
          >
            Log ud
          </button>
        </div>
      )}
    </div>
  );
}