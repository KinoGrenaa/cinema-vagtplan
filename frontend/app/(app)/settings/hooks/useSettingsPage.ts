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

import type { PushMessageTone } from "../components/sections/PushNotificationsSection";
import type { CinemaMembership } from "../helpers/settingsTypes";

export type DefaultCinemaOptions = {
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  defaultCinemaId: number | null;
  allowNoDefault: boolean;
  cinemas: Array<{
    id: number;
    name: string;
    logoUrl?: string | null;
    isDefault: boolean;
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

function browserSupportsPushNotifications() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function useSettingsPage() {
  const infoDialog = useInfoModal();
  const { user: currentUser, login } = useAuth();
  const { theme, setTheme } = useTheme();

  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [pushSupported, setPushSupported] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [pushMessageTone, setPushMessageTone] =
    useState<PushMessageTone>("info");

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

  const isMasterWithoutOwnCinema =
    currentUser?.role === "MASTER" && !currentUser.cinemaId;

  useEffect(() => {
    let cancelled = false;

    async function loadPushStatus() {
      const supported = browserSupportsPushNotifications();

      if (!cancelled) {
        setPushSupported(supported);
      }

      if (!supported) {
        if (!cancelled) {
          setPushEnabled(false);
          setPushMessageTone("warning");
          setPushMessage(
            "Denne browser eller enhed understøtter ikke web-push.",
          );
        }
        return;
      }

      if (!cancelled) {
        setPermission(Notification.permission);
      }

      try {
        const enabled = await isPushNotificationsEnabled();

        if (!cancelled) {
          setPushEnabled(enabled);
        }
      } catch {
        if (!cancelled) {
          setPushMessageTone("error");
          setPushMessage(
            "Push-status kunne ikke kontrolleres. Prøv at genindlæse siden.",
          );
        }
      }
    }

    void loadPushStatus();

    return () => {
      cancelled = true;
    };
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
          setSelectedDefaultCinemaId(payload.defaultCinemaId);
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

      const response = await apiFetch("/auth/default-cinema", {
        method: "PATCH",
        body: JSON.stringify({
          cinemaId: selectedDefaultCinemaId,
        }),
      });

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

      if (!payload.access_token || !payload.user) {
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

    if (!pushSupported) {
      setPushMessageTone("warning");
      setPushMessage(
        "Denne browser eller enhed understøtter ikke web-push.",
      );
      return;
    }

    try {
      setPushLoading(true);
      setPushMessage("");

      const success = await enablePushNotifications();
      const currentPermission = Notification.permission;

      setPermission(currentPermission);
      setPushEnabled(success);

      if (success) {
        setPushMessageTone("success");
        setPushMessage(
          "Push-notifikationer er aktiveret på denne browser.",
        );
      } else if (currentPermission === "denied") {
        setPushMessageTone("error");
        setPushMessage(
          "Browseren har blokeret notifikationer. Tillad dem manuelt i browserens indstillinger.",
        );
      } else {
        setPushMessageTone("warning");
        setPushMessage(
          "Push-notifikationer kunne ikke aktiveres. Kontrollér browserens tilladelser og prøv igen.",
        );
      }
    } catch {
      setPushMessageTone("error");
      setPushMessage(
        "Push-notifikationer kunne ikke aktiveres på grund af en teknisk fejl.",
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function disableNotifications() {
    if (!pushSupported) {
      setPushMessageTone("warning");
      setPushMessage(
        "Denne browser eller enhed understøtter ikke web-push.",
      );
      return;
    }

    try {
      setPushLoading(true);
      setPushMessage("");

      const success = await disablePushNotifications();
      const enabled = await isPushNotificationsEnabled();

      setPermission(Notification.permission);
      setPushEnabled(enabled);

      if (success && !enabled) {
        setPushMessageTone("success");
        setPushMessage(
          "Push-notifikationer er deaktiveret på denne browser.",
        );
      } else if (!enabled) {
        setPushMessageTone("warning");
        setPushMessage(
          "Push er deaktiveret i browseren, men serveren kunne ikke bekræfte hele afmeldingen.",
        );
      } else {
        setPushMessageTone("error");
        setPushMessage(
          "Push-notifikationer kunne ikke deaktiveres. Prøv igen.",
        );
      }
    } catch {
      setPushMessageTone("error");
      setPushMessage(
        "Push-notifikationer kunne ikke deaktiveres på grund af en teknisk fejl.",
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
    pushSupported,
    pushEnabled,
    pushLoading,
    pushMessage,
    pushMessageTone,
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
