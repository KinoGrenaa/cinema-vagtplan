import { apiFetch } from "../lib/api";
import type { Message } from "../types/messages";

type SendMessageInput = {
  subject: string;
  body: string;
  receiverId?: number | null;
  isBroadcast: boolean;
};

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

export async function fetchInboxMessages(): Promise<Message[]> {
  const response = await apiFetch("/messages");

  const data = await safeJson<Message[]>(response);

  return Array.isArray(data) ? data : [];
}

export async function fetchSentMessages(): Promise<Message[]> {
  const response = await apiFetch("/messages/sent");

  const data = await safeJson<Message[]>(response);

  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadMessageCount(): Promise<number> {
  const response = await apiFetch("/messages/unread-count");

  const data = await safeJson<{ count?: number }>(response);

  return Number(data?.count || 0);
}

export async function markMessageAsRead(messageId: number): Promise<void> {
  const response = await apiFetch(`/messages/${messageId}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke markere besked som læst");
  }
}

export async function archiveMessage(messageId: number): Promise<void> {
  const response = await apiFetch(`/messages/${messageId}/archive`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke arkivere besked");
  }
}

export async function sendMessage(input: SendMessageInput): Promise<void> {
  const response = await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Kunne ikke sende besked");
  }
}
