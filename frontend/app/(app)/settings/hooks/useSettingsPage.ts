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

export type DefaultCinemaOptions = {
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  homeCinemaId: number | null;
  defaultCinemaId: number | null;
  allowNoDefault: boolean;
  cinemas: Array<{
    id: number;
    name: string;
    logoUrl?: string | null;
    isDefault: boolean;
    isHomeCinema: boolean;
  }>;
};

type SwitchCinemaResponse = {
  access_token?: string;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: "MASTER" | "ADMIN" | "EMPLOYEE";
    cinemaId: number | null;
    defaultCinemaId?: number | null;
  };
};

async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  const payload = await response.json().catch(() => null);

  if (typeof payload?.message === "string") {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    return payload.message.join("\n");
  }

  return fallback;
}

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
  const [defaultCinemaOptions, setDefaultCinemaOptions] =
    useState<DefaultCinemaOptions | null>(null);
  const [
    selectedDefaultCinemaId,
    setSelectedDefaultCinemaId,
  ] = useState<number | null>(null);
  const [defaultCinemaLoading, setDefaultCinemaLoading] =
    useState(true);
  const [defaultCinemaSaving, setDefaultCinemaSaving] =
    useState(false);
  const [defaultCinemaError, setDefaultCinemaError] =
    useState("");
  const [defaultCinemaMessage, setDefaultCinemaMessage] =
    useState("");
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

    const activeUser = currentUser;
    let cancelled = false;

    async function loadDefaultCinemaOptions() {
      try {
        setDefaultCinemaLoading(true);
        setDefaultCinemaError("");
        setDefaultCinemaMessage("");

        const response = await apiFetch(
          "/auth/default-cinema-options",
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Standardbiografen kunne ikke hentes.",
            ),
          );
        }

        const payload =
          (await response.json()) as DefaultCinemaOptions;

        if (!cancelled) {
          setDefaultCinemaOptions(payload);
          setSelectedDefaultCinemaId(
            payload.defaultCinemaId,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setDefaultCinemaOptions(null);
          setSelectedDefaultCinemaId(null);
          setDefaultCinemaError(
            error instanceof Error
              ? error.message
              : "Standardbiografen kunne ikke hentes.",
          );
        }
      } finally {
        if (!cancelled) {
          setDefaultCinemaLoading(false);
        }
      }
    }

    async function loadCinemaMemberships() {
      if (activeUser.role === "MASTER") {
        setCinemaMemberships([]);
        setCinemaMembershipsError("");
        setCinemaMembershipsLoading(false);
        return;
      }

      try {
        setCinemaMembershipsLoading(true);
        setCinemaMembershipsError("");

        const response = await apiFetch(
          "/users/me/cinema-memberships",
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Biograftilknytninger kunne ikke hentes.",
            ),
          );
        }

        const payload = await response.json();

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

    void loadDefaultCinemaOptions();
    void loadCinemaMemberships();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  async function saveDefaultCinema() {
    if (!currentUser || !defaultCinemaOptions) {
      return;
    }

    try {
      setDefaultCinemaSaving(true);
      setDefaultCinemaError("");
      setDefaultCinemaMessage("");

      const response = await apiFetch(
        "/auth/default-cinema",
        {
          method: "PATCH",
          body: JSON.stringify({
            cinemaId: selectedDefaultCinemaId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Standardbiografen kunne ikke gemmes.",
          ),
        );
      }

      const payload =
        (await response.json()) as DefaultCinemaOptions;

      setDefaultCinemaOptions(payload);
      setSelectedDefaultCinemaId(payload.defaultCinemaId);
      setDefaultCinemaMessage(
        payload.defaultCinemaId === null
          ? "Standardbiografen er fjernet. Næste login starter uden aktiv biograf."
          : "Standardbiografen er gemt og bruges ved næste login.",
      );
    } catch (error) {
      setDefaultCinemaError(
        error instanceof Error
          ? error.message
          : "Standardbiografen kunne ikke gemmes.",
      );
    } finally {
      setDefaultCinemaSaving(false);
    }
  }

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

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Biografen kunne ikke vælges.",
          ),
        );
      }

      const payload =
        (await response.json()) as SwitchCinemaResponse;

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
    defaultCinemaOptions,
    selectedDefaultCinemaId,
    setSelectedDefaultCinemaId,
    defaultCinemaLoading,
    defaultCinemaSaving,
    defaultCinemaError,
    defaultCinemaMessage,
    isMasterWithoutOwnCinema: Boolean(
      isMasterWithoutOwnCinema,
    ),
    saveDefaultCinema,
    switchCinema,
    enableNotifications,
    disableNotifications,
    infoDialog,
  };
}
