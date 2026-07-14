"use client";

import { useEffect, useState } from "react";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTheme } from "@/app/providers/ThemeProvider";

import type { CinemaMembership } from "../helpers/settingsTypes";

type SwitchCinemaResponse = {
  access_token?: string;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: "MASTER" | "ADMIN" | "EMPLOYEE";
    cinemaId: number | null;
  };
};

export function useSettingsPage() {
  const infoDialog = useInfoModal();
  const { user: currentUser, login } = useAuth();
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
  const [switchingCinemaId, setSwitchingCinemaId] = useState<
    number | null
  >(null);
  const { theme, setTheme } = useTheme();

  const isMasterWithoutOwnCinema =
    currentUser?.role === "MASTER" && !currentUser.cinemaId;

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    async function loadPushStatus() {
      const enabled = await isPushNotificationsEnabled();
      setPushEnabled(enabled);
    }

    void loadPushStatus();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let cancelled = false;

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

        if (!cancelled) {
          setCinemaMemberships(
            Array.isArray(payload) ? payload : [],
          );
        }
      } catch (error) {
        if (!cancelled) {
          setCinemaMemberships([]);
          setCinemaMembershipsError(
            error instanceof Error
              ? error.message
              : "Biograftilknytninger kunne ikke hentes.",
          );
        }
      } finally {
        if (!cancelled) {
          setCinemaMembershipsLoading(false);
        }
      }
    }

    void loadCinemaMemberships();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  async function switchCinema(cinemaId: number) {
    if (!currentUser || currentUser.role === "MASTER") {
      return;
    }

    if (currentUser.cinemaId === cinemaId) {
      return;
    }

    try {
      setSwitchingCinemaId(cinemaId);

      const response = await apiFetch("/auth/switch-cinema", {
        method: "POST",
        body: JSON.stringify({ cinemaId }),
      });
      const payload =
        (await response.json().catch(() => null)) as
          | SwitchCinemaResponse
          | null;

      if (!response.ok) {
        throw new Error(
          typeof (payload as any)?.message === "string"
            ? (payload as any).message
            : "Biografen kunne ikke vælges.",
        );
      }

      if (!payload?.access_token || !payload.user) {
        throw new Error(
          "Serveren returnerede ikke en gyldig session.",
        );
      }

      login(payload.access_token, payload.user);
      window.location.reload();
    } catch (error) {
      infoDialog.showError(
        "Biografen kunne ikke vælges",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl under biografskiftet.",
      );
      setSwitchingCinemaId(null);
    }
  }

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
    switchingCinemaId,
    isMasterWithoutOwnCinema: Boolean(
      isMasterWithoutOwnCinema,
    ),
    switchCinema,
    enableNotifications,
    disableNotifications,
    infoDialog,
  };
}
