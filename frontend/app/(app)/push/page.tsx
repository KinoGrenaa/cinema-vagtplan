"use client";

import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function PushPage() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function enableNotifications() {
    try {
      setLoading(true);

      if (!("Notification" in window)) {
        alert(
          "Push-notifikationer understøttes ikke i denne browser.",
        );
        return;
      }

      const result =
        await Notification.requestPermission();

      setPermission(result);

      if (result === "granted") {
        new Notification("Notifikationer aktiveret", {
          body: "Du vil nu modtage push-notifikationer fra vagtplanen.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function getStatus() {
    if (permission === "granted") {
      return {
        title: "Aktiveret",
        text: "Du modtager push-notifikationer.",
        icon: (
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        ),
        className:
          "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
      };
    }

    if (permission === "denied") {
      return {
        title: "Blokeret",
        text: "Notifikationer er blokeret i browseren.",
        icon: (
          <BellOff className="h-10 w-10 text-red-600" />
        ),
        className:
          "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
      };
    }

    return {
      title: "Ikke aktiveret",
      text: "Du har endnu ikke aktiveret notifikationer.",
      icon: (
        <Bell className="h-10 w-10 text-yellow-600" />
      ),
      className:
        "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40",
    };
  }

  const status = getStatus();

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">
            Push-notifikationer
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Modtag beskeder om vagter, bytter,
            fridage og systemopdateringer direkte
            på din enhed.
          </p>
        </div>

        <section
          className={`rounded-2xl border p-6 shadow-sm transition-colors ${status.className}`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div>{status.icon}</div>

            <div>
              <h2 className="text-2xl font-bold">
                {status.title}
              </h2>

              <p className="mt-1 text-gray-700 dark:text-gray-300">
                {status.text}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-2xl font-bold">
            Aktiver notifikationer
          </h2>

          <div className="space-y-4 text-gray-600 dark:text-gray-300">
            <p>
              Når push-notifikationer er aktiveret,
              kan systemet sende:
            </p>

            <ul className="list-disc space-y-2 pl-6">
              <li>Nye beskeder</li>
              <li>Direkte vagtbytter</li>
              <li>Åbne vagter i puljen</li>
              <li>Godkendelse af fridage</li>
              <li>Påmindelser om kommende vagter</li>
            </ul>
          </div>

          <button
            onClick={enableNotifications}
            disabled={
              loading || permission === "granted"
            }
            className="mt-6 rounded-xl bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {loading
              ? "Aktiverer..."
              : permission === "granted"
              ? "Notifikationer aktiveret"
              : "Aktiver notifikationer"}
          </button>

          {permission === "denied" && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              Browseren har blokeret notifikationer.
              Du skal manuelt tillade dem i browserens
              indstillinger.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}