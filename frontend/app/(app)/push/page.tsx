"use client";

import { useEffect, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";
import PushHeader from "./components/PushHeader";
import PushManageSection from "./components/PushManageSection";
import PushStatusSection from "./components/PushStatusSection";
import { getPushStatus } from "./helpers/pushHelpers";

export default function PushPage() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
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
