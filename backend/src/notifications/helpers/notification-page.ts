export const DEFAULT_NOTIFICATION_PAGE_SIZE =
  50;
export const MAX_NOTIFICATION_PAGE_SIZE =
  100;

export type NotificationPageOptions = {
  limit?: number;
  beforeId?: number;
};

export type NotificationPageResult<
  T,
> = {
  items: T[];
  hasMore: boolean;
  nextBeforeId: number | null;
};

export function normalizeNotificationPageLimit(
  value?: number,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return DEFAULT_NOTIFICATION_PAGE_SIZE;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_NOTIFICATION_PAGE_SIZE;
  }

  return Math.min(
    value,
    MAX_NOTIFICATION_PAGE_SIZE,
  );
}

export function buildNotificationPage<
  T extends {
    id: number;
  },
>(
  rows: T[],
  limit: number,
): NotificationPageResult<T> {
  const items =
    rows.slice(0, limit);
  const hasMore =
    rows.length > limit;

  return {
    items,
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
