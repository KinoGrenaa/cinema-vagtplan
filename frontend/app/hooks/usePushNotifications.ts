"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator)) return false;

  if (!("PushManager" in window)) return false;

  if (!("Notification" in window)) return false;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) return false;

  const permission = await Notification.requestPermission();

  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.register("/sw.js");

  const existingSubscription = await registration.pushManager.getSubscription();

  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const token = localStorage.getItem("token");

  if (!token) return false;

  await fetch(`${API_URL}/push-subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(subscription),
  });

  return true;
}

export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration();

  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }
}
