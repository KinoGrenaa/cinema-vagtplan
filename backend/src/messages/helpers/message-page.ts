import {
  Prisma,
} from '@prisma/client';

import {
  getMessageDeletionCutoff,
} from './message-retention';

export const DEFAULT_MESSAGE_PAGE_SIZE =
  50;
export const MAX_MESSAGE_PAGE_SIZE =
  100;

export type InboxMessagePageOptions = {
  limit?: number;
  beforeId?: number;
  targetId?: number;
};

export type SentMessagePageOptions = {
  limit?: number;
  beforeId?: number;
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
    recalledAt: null,
    recipients: {
      some: {
        userId,
        deletedAt: null,
      },
    },
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

export function buildSentMessageWhere(
  userId: number,
  cinemaId: number,
  beforeId?: number,
): Prisma.MessageWhereInput {
  return {
    cinemaId,
    senderId: userId,
    senderDeletedAt: null,
    ...(beforeId
      ? {
          id: {
            lt: beforeId,
          },
        }
      : {}),
  };
}

function buildDeletedMessageBaseWhere(
  cinemaId: number,
): Prisma.MessageWhereInput {
  return {
    cinemaId,
    recalledAt: null,
  };
}

export function buildArchivedMessageWhere(
  userId: number,
  cinemaId: number,
  section:
    ArchiveMessageSection,
  beforeId?: number,
  now: Date = new Date(),
): Prisma.MessageWhereInput {
  const base =
    buildDeletedMessageBaseWhere(
      cinemaId,
    );
  const cutoff =
    getMessageDeletionCutoff(now);

  if (section === 'sent') {
    return {
      ...base,
      senderId: userId,
      senderDeletedAt: {
        gt: cutoff,
      },
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
    recipients: {
      some: {
        userId,
        deletedAt: {
          gt: cutoff,
        },
      },
    },
    ...(beforeId
      ? {
          id: {
            lt: beforeId,
          },
        }
      : {}),
  };
}

export function buildArchivedMessageCountWhere(
  userId: number,
  cinemaId: number,
  now: Date = new Date(),
): Prisma.MessageWhereInput {
  const cutoff =
    getMessageDeletionCutoff(now);

  return {
    ...buildDeletedMessageBaseWhere(
      cinemaId,
    ),
    OR: [
      {
        senderId: userId,
        senderDeletedAt: {
          gt: cutoff,
        },
      },
      {
        recipients: {
          some: {
            userId,
            deletedAt: {
              gt: cutoff,
            },
          },
        },
      },
    ],
  };
}

export function buildArchivedMessageCounts(
  countGroups: Array<{
    senderId: number;
    _count: {
      _all: number;
    };
  }>,
  userId: number,
) {
  return countGroups.reduce(
    (counts, group) => {
      if (group.senderId === userId) {
        counts.sent +=
          group._count._all;
      } else {
        counts.received +=
          group._count._all;
      }

      return counts;
    },
    {
      received: 0,
      sent: 0,
    },
  );
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
