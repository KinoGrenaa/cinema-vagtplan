import { apiFetch } from "../lib/api";
import type { Notification } from "../types/notifications";

async function safeJson(response: Response) {
  try {
    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchNotifications() {
  const response = await apiFetch("/notifications");

  const data = await safeJson(response);

  return Array.isArray(data) ? (data as Notification[]) : [];
}

export async function fetchUnreadNotificationCount() {
  const response = await apiFetch("/notifications/unread-count");

  const data = await safeJson(response);

  return Number(data?.count || 0);
}

export async function markNotificationAsRead(notificationId: number) {
  const response = await apiFetch(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke markere notifikation som læst");
  }
}

export async function markAllNotificationsAsRead() {
  const response = await apiFetch("/notifications/read-all", {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke markere alle notifikationer som læst");
  }
}
