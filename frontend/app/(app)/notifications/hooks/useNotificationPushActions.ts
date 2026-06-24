"use client";

import { useEffect, useState } from "react";

import {
  disablePushNotifications,
  enablePushNotifications,
  isPushNotificationsEnabled,
} from "@/app/hooks/usePushNotifications";

import { getErrorMessage } from "../helpers/notificationHelpers";

type UseNotificationPushActionsParams = {
  showError: (title: string, description: string) => void;
};

export function useNotificationPushActions({
  showError,
}: UseNotificationPushActionsParams) {
  const [pushMessage, setPushMessage] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    async function loadPushStatus() {
      try {
        const enabled = await isPushNotificationsEnabled();
        setPushEnabled(enabled);
      } catch (error) {
        showError(
          "Kunne ikke hente push-status",
          getErrorMessage(
            error,
            "Der opstod en uventet fejl under hentning af push-status.",
          ),
        );
      }
    }

    loadPushStatus();
  }, [showError]);

  async function handleEnablePush() {
    try {
      setPushLoading(true);

      const success = await enablePushNotifications();
      setPushEnabled(success);

      if (!success) {
        setPushMessage("");
        showError(
          "Push kunne ikke aktiveres",
          "Push-notifikationer kunne ikke aktiveres på denne browser.",
        );
        return;
      }

      setPushMessage("Push-notifikationer er aktiveret.");
    } catch (error) {
      setPushMessage("");
      showError(
        "Push kunne ikke aktiveres",
        getErrorMessage(
          error,
          "Der opstod en uventet fejl under aktivering af push-notifikationer.",
        ),
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function handleDisablePush() {
    try {
      setPushLoading(true);
      await disablePushNotifications();
      setPushEnabled(false);
      setPushMessage("Push-notifikationer er deaktiveret på denne browser.");
    } catch (error) {
      showError(
        "Push kunne ikke deaktiveres",
        getErrorMessage(
          error,
          "Der opstod en uventet fejl under deaktivering af push-notifikationer.",
        ),
      );
    } finally {
      setPushLoading(false);
    }
  }

  return {
    pushMessage,
    pushEnabled,
    pushLoading,
    handleEnablePush,
    handleDisablePush,
  };
}
