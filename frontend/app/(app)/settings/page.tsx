"use client";

import { useEffect, useState } from "react";

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [allowPool, setAllowPool] = useState(false);
  const [allowDirect, setAllowDirect] = useState(false);
  const [message, setMessage] = useState("");

  function getToken() {
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchSettings();
  }, []);

  async function fetchSettings() {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;

    const user: CurrentUser = JSON.parse(savedUser);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cinemas/${user.cinemaId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();

    setAllowPool(Boolean(data.allowShiftTradePool));
    setAllowDirect(Boolean(data.allowShiftTradeDirect));
  }

  async function saveSettings() {
    if (!currentUser) return;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cinemas/${currentUser.cinemaId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        allowShiftTradePool: allowPool,
        allowShiftTradeDirect: allowDirect,
      }),
    });

    if (!response.ok) {
      setMessage("Kunne ikke gemme indstillinger");
      return;
    }

    setMessage("Indstillinger gemt");
  }

  if (!currentUser) {
    return <main className="p-10">Indlæser...</main>;
  }

  if (currentUser.role !== "ADMIN" && currentUser.role !== "MASTER") {
    return <main className="p-10">Ingen adgang</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Indstillinger</h1>
        <p className="text-gray-500 mb-6">Styr hvilke vagtbytte-funktioner personalet må bruge.</p>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowPool}
              onChange={(e) => setAllowPool(e.target.checked)}
            />
            <span>Personalet må sende vagter til fælles pulje</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowDirect}
              onChange={(e) => setAllowDirect(e.target.checked)}
            />
            <span>Personalet må sende vagter direkte til kollegaer</span>
          </label>
        </div>

        <button
          onClick={saveSettings}
          className="mt-6 bg-black text-white px-6 py-3 rounded-lg"
        >
          Gem indstillinger
        </button>

        {message && <div className="mt-4 text-sm text-gray-600">{message}</div>}
      </div>
    </main>
  );
}