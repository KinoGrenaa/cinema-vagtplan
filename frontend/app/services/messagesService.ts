import { apiFetch } from "../lib/api";

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

export async function fetchInboxMessages() {
  const response = await apiFetch("/messages");

  const data = await safeJson(response);

  return Array.isArray(data) ? data : [];
}

export async function fetchSentMessages() {
  const response = await apiFetch("/messages/sent");

  const data = await safeJson(response);

  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadMessageCount() {
  const response = await apiFetch("/messages/unread-count");

  const data = await safeJson(response);

  return Number(data?.count || 0);
}

export async function markMessageAsRead(messageId: number) {
  const response = await apiFetch(`/messages/${messageId}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke markere besked som læst");
  }
}

export async function archiveMessage(messageId: number) {
  const response = await apiFetch(`/messages/${messageId}/archive`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke arkivere besked");
  }
}

export async function sendMessage(input: {
  subject: string;
  body: string;
  receiverId?: number | null;
  isBroadcast: boolean;
}) {
  const response = await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Kunne ikke sende besked");
  }
}
