import { apiFetch } from "../lib/api";
import type { Notification } from "../types/notifications";

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchNotifications(): Promise<Notification[]> {
  const response = await apiFetch("/notifications");

  const data = await safeJson<Notification[]>(response);

  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await apiFetch("/notifications/unread-count");

  const data = await safeJson<{ count?: number }>(response);

  return Number(data?.count || 0);
}

export async function markNotificationAsRead(
  notificationId: number,
): Promise<void> {
  const response = await apiFetch(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke markere notifikation som læst");
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await apiFetch("/notifications/read-all", {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke markere alle notifikationer som læst");
  }
}
