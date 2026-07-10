"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";
import PushHeader from "./components/layout/PushHeader";
import PushManageSection from "./components/sections/PushManageSection";
import PushStatusSection from "./components/sections/PushStatusSection";
import { getPushStatus } from "./helpers/pushHelpers";

type StoredUser = {
  role?: string;
  cinemaId?: number | null;
};

function isGlobalMasterUser(user: StoredUser | null) {
  return user?.role === "MASTER" && !user.cinemaId;
}

export default function PushPage() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [isGlobalMaster, setIsGlobalMaster] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const parsedUser: StoredUser = JSON.parse(savedUser);
        const globalMaster = isGlobalMasterUser(parsedUser);

        setIsGlobalMaster(globalMaster);

        if (globalMaster) {
          return;
        }
      } catch {
        // AuthProvider håndterer ugyldig session. Push-siden skal bare undgå at crashe.
      }
    }

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    async function loadPushStatus() {
      const enabled = await isPushNotificationsEnabled();

      setPushEnabled(enabled);
    }

    loadPushStatus();
  }, []);

  async function enableNotifications() {
    if (isGlobalMaster) {
      setMessage(
        "Push-notifikationer kan kun aktiveres for brugere, der er tilknyttet en biograf.",
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const success = await enablePushNotifications();

      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      setPushEnabled(success);
      setMessage(
        success
          ? "Push-notifikationer er aktiveret på denne browser."
          : "Push-notifikationer kunne ikke aktiveres.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function disableNotifications() {
    try {
      setLoading(true);
      setMessage("");

      await disablePushNotifications();

      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      setPushEnabled(false);
      setMessage("Push-notifikationer er deaktiveret på denne browser.");
    } finally {
      setLoading(false);
    }
  }

  if (isGlobalMaster) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <PushHeader />

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Global MASTER
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              Push kræver biograftilknytning
            </h1>
            <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
              MASTER er en global systemrolle uden egen biograf.
              Push-notifikationer er knyttet til en konkret biografbruger, så
              aktivering skal ske fra en ADMIN- eller EMPLOYEE-bruger.
            </p>
            <div className="mt-5">
              <Link
                href="/settings"
                className="inline-flex rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
              >
                Gå til indstillinger
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const status = getPushStatus(permission, pushEnabled);

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PushHeader />

        <PushStatusSection status={status} />

        <PushManageSection
          permission={permission}
          loading={loading}
          pushEnabled={pushEnabled}
          message={message}
          onEnableNotifications={enableNotifications}
          onDisableNotifications={disableNotifications}
        />
      </div>
    </main>
  );
}
