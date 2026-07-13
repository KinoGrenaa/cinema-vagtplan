"use client";

import { useEffect, useState } from "react";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";
import { apiFetch } from "@/app/lib/api";
import { useTheme } from "@/app/providers/ThemeProvider";

import type {
  CinemaMembership,
  CurrentUser,
} from "../helpers/settingsTypes";

export function useSettingsPage() {
  const infoDialog = useInfoModal();
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [cinemaMemberships, setCinemaMemberships] = useState<
    CinemaMembership[]
  >([]);
  const [cinemaMembershipsLoading, setCinemaMembershipsLoading] =
    useState(true);
  const [cinemaMembershipsError, setCinemaMembershipsError] =
    useState("");
  const { theme, setTheme } = useTheme();

  const isMasterWithoutOwnCinema =
    currentUser?.role === "MASTER" && !currentUser.cinemaId;

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        setCurrentUser(null);
      }
    }

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    async function loadPushStatus() {
      const enabled = await isPushNotificationsEnabled();
      setPushEnabled(enabled);
    }

    async function loadCinemaMemberships() {
      try {
        setCinemaMembershipsLoading(true);
        setCinemaMembershipsError("");

        const response = await apiFetch(
          "/users/me/cinema-memberships",
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "Biograftilknytninger kunne ikke hentes.",
          );
        }

        setCinemaMemberships(
          Array.isArray(payload) ? payload : [],
        );
      } catch (error) {
        setCinemaMemberships([]);
        setCinemaMembershipsError(
          error instanceof Error
            ? error.message
            : "Biograftilknytninger kunne ikke hentes.",
        );
      } finally {
        setCinemaMembershipsLoading(false);
      }
    }

    void loadPushStatus();
    void loadCinemaMemberships();
  }, []);

  async function enableNotifications() {
    if (isMasterWithoutOwnCinema) {
      infoDialog.showError(
        "Push-notifikationer er ikke tilgængelige for MASTER",
        "MASTER-brugere er ikke tilknyttet en konkret biograf.\nPush-notifikationer kan aktiveres for almindelige biografbrugere.",
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
      setPushMessage(
        "Push-notifikationer er deaktiveret på denne browser.",
      );
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
    cinemaMemberships,
    cinemaMembershipsLoading,
    cinemaMembershipsError,
    isMasterWithoutOwnCinema: Boolean(
      isMasterWithoutOwnCinema,
    ),
    enableNotifications,
    disableNotifications,
    infoDialog,
  };
}
