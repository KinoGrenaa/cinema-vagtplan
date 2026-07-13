"use client";

import { usePushNotifications } from "@/app/hooks/usePushNotifications";

export default function PushNotificationProvider() {
  usePushNotifications();

  return null;
}
