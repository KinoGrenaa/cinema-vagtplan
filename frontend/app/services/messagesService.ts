import { apiFetch } from "../lib/api";
import type { Message } from "../types/messages";

type SendMessageInput = {
  subject: string;
  body: string;
  receiverId?: number | null;
  isBroadcast: boolean;
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.clone().json();

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {}

  try {
    const text = await response.text();

    if (text.trim()) {
      return text;
    }
  } catch {}

  return fallback;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchInboxMessages(): Promise<Message[]> {
  const response = await apiFetch("/messages");

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke hente beskeder"),
    );
  }

  const data = await safeJson<Message[]>(response);

  return Array.isArray(data) ? data : [];
}

export async function fetchSentMessages(): Promise<Message[]> {
  const response = await apiFetch("/messages/sent");

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke hente sendte beskeder"),
    );
  }

  const data = await safeJson<Message[]>(response);

  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadMessageCount(): Promise<number> {
  const response = await apiFetch("/messages/unread-count");

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke hente antal ulæste beskeder"),
    );
  }

  const data = await safeJson<{ count?: number }>(response);

  return Number(data?.count || 0);
}

export async function markMessageAsRead(messageId: number): Promise<void> {
  const response = await apiFetch(`/messages/${messageId}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke markere besked som læst"),
    );
  }
}

export async function archiveMessage(messageId: number): Promise<void> {
  const response = await apiFetch(`/messages/${messageId}/archive`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke arkivere besked"),
    );
  }
}

export async function sendMessage(input: SendMessageInput): Promise<void> {
  const response = await apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke sende besked"),
    );
  }
}
