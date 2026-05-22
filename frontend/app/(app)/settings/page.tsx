"use client";

import { useEffect, useState } from "react";

import { Bell, BellOff, CheckCircle2, Moon, Sun } from "lucide-react";

import { useTheme } from "@/app/components/ThemeProvider";

import {
  disablePushNotifications,
  enablePushNotifications,
} from "@/app/hooks/usePushNotifications";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [message, setMessage] = useState("");

  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  const [pushLoading, setPushLoading] = useState(false);

  const [pushMessage, setPushMessage] = useState("");

  const { theme, setTheme } = useTheme();

  function getToken() {
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function enableNotifications() {
    try {
      setPushLoading(true);
      setPushMessage("");

      const success = await enablePushNotifications();

      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      setPushMessage(
        success
          ? "Push-notifikationer er aktiveret på denne browser."
          : "Push-notifikationer kunne ikke aktiveres.",
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function disableNotifications() {
    try {
      setPushLoading(true);
      setPushMessage("");

      await disablePushNotifications();

      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      setPushMessage("Push-notifikationer er deaktiveret på denne browser.");
    } finally {
      setPushLoading(false);
    }
  }

  function getPushStatus() {
    if (permission === "granted") {
      return {
        title: "Aktiveret",
        text: "Browseren har tilladelse til at modtage push-notifikationer.",
        icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
        className:
          "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
      };
    }

    if (permission === "denied") {
      return {
        title: "Blokeret",
        text: "Notifikationer er blokeret i browseren.",
        icon: <BellOff className="h-8 w-8 text-red-600" />,
        className:
          "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
      };
    }

    return {
      title: "Ikke aktiveret",
      text: "Du har endnu ikke aktiveret push-notifikationer.",
      icon: <Bell className="h-8 w-8 text-yellow-600" />,
      className:
        "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40",
    };
  }

  const pushStatus = getPushStatus();

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        Indlæser...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Systemindstillinger</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Administrer personlige indstillinger og appens udseende.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="h-6 w-6" />
            ) : (
              <Sun className="h-6 w-6" />
            )}

            <div>
              <h2 className="text-2xl font-bold">Tema</h2>

              <p className="text-gray-500 dark:text-gray-400">
                Vælg mellem lyst og mørkt tema.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`rounded-xl px-5 py-3 font-medium transition ${
                theme === "light"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
            >
              Lyst tema
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`rounded-xl px-5 py-3 font-medium transition ${
                theme === "dark"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                  : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
            >
              Mørkt tema
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 flex items-center gap-3">
            <Bell className="h-6 w-6" />

            <div>
              <h2 className="text-2xl font-bold">Push-notifikationer</h2>

              <p className="text-gray-500 dark:text-gray-400">
                Modtag beskeder om vagter og systemopdateringer direkte på din
                enhed.
              </p>
            </div>
          </div>

          <div
            className={`mb-6 rounded-2xl border p-4 ${pushStatus.className}`}
          >
            <div className="flex items-center gap-4">
              {pushStatus.icon}

              <div>
                <div className="font-bold">{pushStatus.title}</div>

                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {pushStatus.text}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={enableNotifications}
              disabled={pushLoading || permission === "granted"}
              className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pushLoading
                ? "Arbejder..."
                : permission === "granted"
                  ? "Push er aktiveret"
                  : "Aktivér push-notifikationer"}
            </button>

            <button
              onClick={disableNotifications}
              disabled={pushLoading}
              className="rounded-xl bg-gray-700 px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deaktivér push-notifikationer
            </button>
          </div>

          {pushMessage && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              {pushMessage}
            </div>
          )}

          {permission === "denied" && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              Browseren har blokeret notifikationer. Du skal manuelt tillade dem
              i browserens indstillinger.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
