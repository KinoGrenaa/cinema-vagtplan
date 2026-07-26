export const DEFAULT_MESSAGE_PAGE_SIZE =
  50;
export const MAX_MESSAGE_PAGE_SIZE =
  100;

export type InboxMessagePageOptions = {
  limit?: number;
  beforeId?: number;
  targetId?: number;
};

export type MessagePageResult<T> = {
  items: T[];
  target: T | null;
  hasMore: boolean;
  nextBeforeId: number | null;
};

export function normalizeMessagePageLimit(
  value?: number,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return DEFAULT_MESSAGE_PAGE_SIZE;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_MESSAGE_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_MESSAGE_PAGE_SIZE,
  );
}

export function buildInboxMessageWhere(
  userId: number,
  cinemaId: number,
  beforeId?: number,
) {
  return {
    cinemaId,
    archivedAt: null,
    recalledAt: null,
    OR: [
      {
        receiverId: userId,
      },
      {
        isBroadcast: true,
      },
    ],
    ...(beforeId
      ? {
          id: {
            lt: beforeId,
          },
        }
      : {}),
  };
}

export function buildInboxMessageTargetWhere(
  userId: number,
  cinemaId: number,
  targetId: number,
) {
  return {
    ...buildInboxMessageWhere(
      userId,
      cinemaId,
    ),
    id: targetId,
  };
}

export function buildMessagePage<T extends {
  id: number;
}>(
  rows: T[],
  limit: number,
  target: T | null,
): MessagePageResult<T> {
  const items =
    rows.slice(0, limit);
  const hasMore =
    rows.length > limit;

  return {
    items,
    target,
    hasMore,
    nextBeforeId:
      hasMore &&
      items.length > 0
        ? items[
            items.length - 1
          ].id
        : null,
  };
}
