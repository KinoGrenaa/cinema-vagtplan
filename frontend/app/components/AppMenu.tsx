"use client";

import { useState } from "react";
import { useEffect, useState } from "react";

export default function AppMenu() {
  const [open, setOpen] = useState(false);

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
    <nav className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="flex items-center">
        <button
          onClick={() => setOpen(!open)}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-2 w-64">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              {link.label}
            </a>
          ))}

          <button
            onClick={logout}
            className="px-4 py-3 rounded-lg bg-red-600 text-white text-left"
          >
            Log ud
          </button>
        </div>
      )}
    </nav>
  );
}
