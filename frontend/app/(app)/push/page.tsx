"use client";

import { useState } from "react";

const PUBLIC_VAPID_KEY =
  "BIVekJ5qQNKd6suPpzSFvMDFfA1hS6skf142fzpL-FBF9RXcTqRgH9vX3-_Yxg55E-xvpNgjIY-kAh3zcmjnSi8";

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replaceAll("-", "+")
    .replaceAll("_", "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function PushPage() {
  const [message, setMessage] = useState("");

  function getToken() {
    return localStorage.getItem("token");
  }

  function getCurrentUser(): CurrentUser | null {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  }

  async function enablePush() {
    try {
      setMessage("");

      if (!("serviceWorker" in navigator)) {
        setMessage("Service workers understøttes ikke.");
        return;
      }

      if (!("PushManager" in window)) {
        setMessage("Push understøttes ikke.");
        return;
      }

      const user = getCurrentUser();

      if (!user) {
        setMessage("Du skal være logget ind.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setMessage("Notifikationer blev ikke tilladt.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      const json = subscription.toJSON();

      await fetch("http://localhost:3001/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          userId: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      setMessage("Push-notifikationer aktiveret.");
    } catch (error) {
      console.error(error);
      setMessage("Der opstod en fejl.");
    }
  }

  async function sendTestPush() {
    const user = getCurrentUser();

    if (!user) {
      setMessage("Du skal være logget ind.");
      return;
    }

    await fetch("http://localhost:3001/push/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        userId: user.id,
      }),
    });

    setMessage("Test-notifikation sendt.");
  }
  async function resetPush() {
    const user = getCurrentUser();

    if (!user) {
      setMessage("Du skal være logget ind.");
      return;
    }

    await fetch("http://localhost:3001/push/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        userId: user.id,
      }),
    });

    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }
    }

    setMessage("Push-notifikationer er nulstillet. Aktivér dem igen.");
  }
  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Push notifikationer</h1>

        <p className="text-gray-500">
          Aktivér notifikationer til vagter og beskeder.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={enablePush}
            className="bg-black text-white px-6 py-3 rounded-lg"
          >
            Aktivér notifikationer
          </button>

          <button
            onClick={sendTestPush}
            className="bg-green-600 text-white px-6 py-3 rounded-lg"
          >
            Send test
          </button>
          <button
            onClick={resetPush}
            className="bg-red-600 text-white px-6 py-3 rounded-lg"
          >
            Nulstil push
          </button>
        </div>

        {message && (
          <div className="mt-4 bg-gray-100 rounded-lg p-4">{message}</div>
        )}
      </div>
    </>
  );
}
