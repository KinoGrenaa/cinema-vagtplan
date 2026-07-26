import {
  apiFetch,
} from "../lib/api";
import type {
  Message,
} from "../types/messages";

type SendMessageInput = {
  subject: string;
  body: string;
  receiverId?:
    number | null;
  isBroadcast: boolean;
};

export type InboxMessagePage = {
  items: Message[];
  target: Message | null;
  hasMore: boolean;
  nextBeforeId:
    number | null;
};

async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const data =
      await response
        .clone()
        .json();

    if (
      typeof data?.message ===
      "string"
    ) {
      return data.message;
    }

    if (
      Array.isArray(
        data?.message,
      )
    ) {
      return data.message.join(
        "\n",
      );
    }
  } catch {}

  try {
    const text =
      await response.text();

    if (text.trim()) {
      return text;
    }
  } catch {}

  return fallback;
}

async function safeJson<T>(
  response: Response,
): Promise<T | null> {
  try {
    return (
      await response.json()
    ) as T;
  } catch {
    return null;
  }
}

function sortMessages(
  messages: Message[],
) {
  return [
    ...messages,
  ].sort(
    (left, right) =>
      new Date(
        right.createdAt,
      ).getTime() -
      new Date(
        left.createdAt,
      ).getTime(),
  );
}

export async function fetchInboxMessagePage(
  options: {
    limit?: number;
    beforeId?:
      number | null;
    targetId?:
      number | null;
  } = {},
): Promise<InboxMessagePage> {
  const params =
    new URLSearchParams();

  params.set(
    "limit",
    String(
      options.limit ?? 50,
    ),
  );

  if (options.beforeId) {
    params.set(
      "beforeId",
      String(
        options.beforeId,
      ),
    );
  }

  if (options.targetId) {
    params.set(
      "targetId",
      String(
        options.targetId,
      ),
    );
  }

  const response =
    await apiFetch(
      `/messages/page?${params.toString()}`,
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente beskeder",
      ),
    );
  }

  const data =
    await safeJson<InboxMessagePage>(
      response,
    );

  if (
    !data ||
    !Array.isArray(
      data.items,
    )
  ) {
    return {
      items: [],
      target: null,
      hasMore: false,
      nextBeforeId: null,
    };
  }

  return {
    items:
      sortMessages(
        data.items,
      ),
    target:
      data.target ?? null,
    hasMore:
      Boolean(data.hasMore),
    nextBeforeId:
      Number.isInteger(
        data.nextBeforeId,
      )
        ? data.nextBeforeId
        : null,
  };
}

export async function fetchInboxMessages(): Promise<
  Message[]
> {
  const response =
    await apiFetch(
      "/messages",
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente beskeder",
      ),
    );
  }

  const data =
    await safeJson<
      Message[]
    >(response);

  return Array.isArray(data)
    ? sortMessages(data)
    : [];
}

export async function fetchSentMessages(): Promise<
  Message[]
> {
  const response =
    await apiFetch(
      "/messages/sent",
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente sendte beskeder",
      ),
    );
  }

  const data =
    await safeJson<
      Message[]
    >(response);

  return Array.isArray(data)
    ? sortMessages(data)
    : [];
}

export async function fetchUnreadMessageCount(): Promise<
  number
> {
  const response =
    await apiFetch(
      "/messages/unread-count",
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente antal ulæste beskeder",
      ),
    );
  }

  const data =
    await safeJson<{
      count?: number;
    }>(response);

  return Number(
    data?.count || 0,
  );
}

export async function markMessageAsRead(
  messageId: number,
): Promise<void> {
  const response =
    await apiFetch(
      `/messages/${messageId}/read`,
      {
        method: "PATCH",
      },
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke markere besked som læst",
      ),
    );
  }
}

export async function archiveMessage(
  messageId: number,
): Promise<void> {
  const response =
    await apiFetch(
      `/messages/${messageId}/archive`,
      {
        method: "PATCH",
      },
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke arkivere besked",
      ),
    );
  }
}

export async function sendMessage(
  input: SendMessageInput,
): Promise<void> {
  const response =
    await apiFetch(
      "/messages",
      {
        method: "POST",
        body: JSON.stringify(
          input,
        ),
      },
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke sende besked",
      ),
    );
  }
}
