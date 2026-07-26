import {
  Prisma,
} from '@prisma/client';

export const DEFAULT_MESSAGE_PAGE_SIZE =
  50;
export const MAX_MESSAGE_PAGE_SIZE =
  100;

export type InboxMessagePageOptions = {
  limit?: number;
  beforeId?: number;
  targetId?: number;
};

export type ArchiveMessageSection =
  | 'received'
  | 'sent';

export type ArchivedMessagePageOptions = {
  limit?: number;
  beforeId?: number;
  section:
    ArchiveMessageSection;
};

export type MessagePageResult<T> = {
  items: T[];
  target: T | null;
  hasMore: boolean;
  nextBeforeId: number | null;
};

export type ArchivedMessagePageResult<T> = {
  items: T[];
  hasMore: boolean;
  nextBeforeId: number | null;
  counts: {
    received: number;
    sent: number;
  };
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
): Prisma.MessageWhereInput {
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
): Prisma.MessageWhereInput {
  return {
    ...buildInboxMessageWhere(
      userId,
      cinemaId,
    ),
    id: targetId,
  };
}

function buildArchivedMessageBaseWhere(
  cinemaId: number,
): Prisma.MessageWhereInput {
  return {
    cinemaId,
    archivedAt: {
      not: null,
    },
    recalledAt: null,
  };
}

export function buildArchivedMessageWhere(
  userId: number,
  cinemaId: number,
  section:
    ArchiveMessageSection,
  beforeId?: number,
): Prisma.MessageWhereInput {
  const base =
    buildArchivedMessageBaseWhere(
      cinemaId,
    );

  if (section === 'sent') {
    return {
      ...base,
      senderId: userId,
      ...(beforeId
        ? {
            id: {
              lt: beforeId,
            },
          }
        : {}),
    };
  }

  return {
    ...base,
    senderId: {
      not: userId,
    },
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

export function buildArchivedMessagePage<
  T extends {
    id: number;
  },
>(
  rows: T[],
  limit: number,
  counts: {
    received: number;
    sent: number;
  },
): ArchivedMessagePageResult<T> {
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
    counts,
  };
}
