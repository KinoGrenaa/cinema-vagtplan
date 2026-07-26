import {
  apiFetch,
} from "../lib/api";
import type {
  Notification,
} from "../types/notifications";

export type NotificationPage = {
  items: Notification[];
  hasMore: boolean;
  nextBeforeId: number | null;
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

function getTimestamp(
  value: string,
) {
  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(
    timestamp,
  )
    ? 0
    : timestamp;
}

function sortNotificationsByCreatedAtDescending(
  notifications:
    Notification[],
) {
  return [
    ...notifications,
  ].sort(
    (left, right) =>
      getTimestamp(
        right.createdAt,
      ) -
      getTimestamp(
        left.createdAt,
      ),
  );
}

function getCinemaQuery(
  cinemaId: number,
) {
  return (
    `cinemaId=${encodeURIComponent(
      String(cinemaId),
    )}`
  );
}

export async function fetchNotificationPage(
  cinemaId: number,
  options: {
    limit?: number;
    beforeId?: number | null;
    unreadOnly?: boolean;
  } = {},
): Promise<NotificationPage> {
  const params =
    new URLSearchParams();

  params.set(
    "cinemaId",
    String(cinemaId),
  );
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

  if (options.unreadOnly) {
    params.set(
      "unreadOnly",
      "true",
    );
  }

  const response =
    await apiFetch(
      `/notifications/page?${params.toString()}`,
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente notifikationer",
      ),
    );
  }

  const data =
    await safeJson<NotificationPage>(
      response,
    );

  if (
    !data ||
    !Array.isArray(data.items)
  ) {
    return {
      items: [],
      hasMore: false,
      nextBeforeId: null,
    };
  }

  return {
    items:
      sortNotificationsByCreatedAtDescending(
        data.items,
      ),
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

export async function fetchNotifications(
  cinemaId: number,
): Promise<Notification[]> {
  const response =
    await apiFetch(
      `/notifications?${getCinemaQuery(
        cinemaId,
      )}`,
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente notifikationer",
      ),
    );
  }

  const data =
    await safeJson<
      Notification[]
    >(response);

  return Array.isArray(data)
    ? sortNotificationsByCreatedAtDescending(
        data,
      )
    : [];
}

export async function fetchUnreadNotificationCount(
  cinemaId: number,
): Promise<number> {
  const response =
    await apiFetch(
      `/notifications/unread-count?${getCinemaQuery(
        cinemaId,
      )}`,
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente antal ulæste notifikationer",
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

export async function markNotificationAsRead(
  notificationId: number,
  cinemaId: number,
): Promise<void> {
  const response =
    await apiFetch(
      `/notifications/${notificationId}/read?${getCinemaQuery(
        cinemaId,
      )}`,
      {
        method: "PATCH",
      },
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke markere notifikation som læst",
      ),
    );
  }
}

export async function markAllNotificationsAsRead(
  cinemaId: number,
): Promise<void> {
  const response =
    await apiFetch(
      `/notifications/read-all?${getCinemaQuery(
        cinemaId,
      )}`,
      {
        method: "PATCH",
      },
    );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke markere alle notifikationer som læst",
      ),
    );
  }
}
