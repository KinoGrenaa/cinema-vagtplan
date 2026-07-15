"use client";

import { apiFetch } from "@/app/lib/api";

function urlBase64ToUint8Array(
  base64String: string,
) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4,
  );
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0),
    ),
  );
}

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  if (!("PushManager" in window)) {
    return false;
  }

  if (!("Notification" in window)) {
    return false;
  }

  const vapidPublicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return false;
  }

  const permission =
    await Notification.requestPermission();

  if (permission !== "granted") {
    return false;
  }

  const registration =
    await navigator.serviceWorker.register("/sw.js");
  const existingSubscription =
    await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        urlBase64ToUint8Array(vapidPublicKey),
    }));

  const response = await apiFetch(
    "/push-subscriptions",
    {
      method: "POST",
      body: JSON.stringify(subscription),
    },
  );

  if (!response.ok) {
    return false;
  }

  return true;
}

export async function isPushNotificationsEnabled() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  if (!("PushManager" in window)) {
    return false;
  }

  const registration =
    await navigator.serviceWorker.getRegistration();

  if (!registration) {
    return false;
  }

  const subscription =
    await registration.pushManager.getSubscription();

  return Boolean(subscription);
}

export async function disablePushNotifications() {
  const registration =
    await navigator.serviceWorker.getRegistration();

  if (!registration) {
    return false;
  }

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return true;
  }

  let backendDeleted = false;

  try {
    const response = await apiFetch(
      "/push-subscriptions",
      {
        method: "DELETE",
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      },
    );

    backendDeleted = response.ok;
  } catch {
    backendDeleted = false;
  }

  const browserDeleted =
    await subscription.unsubscribe();

  return backendDeleted && browserDeleted;
}

export function usePushNotifications() {
  return null;
}
