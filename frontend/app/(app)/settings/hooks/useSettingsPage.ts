"use client";

import { useEffect, useState } from "react";

import { useTheme } from "@/app/components/ThemeProvider";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";

import type { CurrentUser } from "../helpers/settingsTypes";

export function useSettingsPage() {
  const infoDialog = useInfoModal();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  const { theme, setTheme } = useTheme();

  const isMasterWithoutOwnCinema =
    currentUser?.role === "MASTER" && !currentUser.cinemaId;

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
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
    if (isMasterWithoutOwnCinema) {
      infoDialog.showError(
        "Push-notifikationer er ikke tilgængelige for MASTER",
        "MASTER-brugere er ikke tilknyttet en konkret biograf. Push-notifikationer kan aktiveres for almindelige biografbrugere.",
      );
      return;
    }

    try {
      setPushLoading(true);
      setPushMessage("");

      const success = await enablePushNotifications();

      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      setPushEnabled(success);

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

      setPushEnabled(false);

      setPushMessage("Push-notifikationer er deaktiveret på denne browser.");
    } finally {
      setPushLoading(false);
    }
  }

  return {
    currentUser,
    theme,
    setTheme,
    permission,
    pushEnabled,
    pushLoading,
    pushMessage,
    isMasterWithoutOwnCinema: Boolean(isMasterWithoutOwnCinema),
    enableNotifications,
    disableNotifications,
    infoDialog,
  };
}
