import type { PrismaService } from '../../prisma/prisma.service';

export type AuditUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type AuditLogForView = {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string | null;
  createdAt: Date;
  userId: number | null;
  cinemaId: number | null;
  user: AuditUser | null;
  cinema: {
    name: string;
  } | null;
};

export const auditLogSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  description: true,
  createdAt: true,
  userId: true,
  cinemaId: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  cinema: {
    select: {
      name: true,
    },
  },
};

export async function addSubjectUsers(
  prisma: PrismaService,
  logs: AuditLogForView[],
) {
  const timeEntryIds = getEntityIds(
    logs.filter((log) => isTimeEntryEntity(log.entityType)),
  );

  const userIds = getEntityIds(
    logs.filter((log) => isUserEntity(log.entityType)),
  );

  const [timeEntries, users] = await Promise.all([
    timeEntryIds.length
      ? prisma.timeEntry.findMany({
          where: {
            id: {
              in: timeEntryIds,
            },
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        })
      : [],
    userIds.length
      ? prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : [],
  ]);

  const timeEntryUserById = new Map<number, AuditUser>(
    timeEntries.map((entry) => [entry.id, entry.user] as const),
  );

  const userById = new Map<number, AuditUser>(
    users.map((user) => [user.id, user] as const),
  );

  return logs.map((log) => {
    const subjectUser = getSubjectUser(log, timeEntryUserById, userById);

    return {
      ...log,
      subjectUser,
    };
  });
}

function getEntityIds(logs: AuditLogForView[]) {
  return Array.from(
    new Set(
      logs
        .map((log) => log.entityId)
        .filter((entityId): entityId is number => typeof entityId === 'number'),
    ),
  );
}

function getSubjectUser(
  log: AuditLogForView,
  timeEntryUserById: Map<number, AuditUser>,
  userById: Map<number, AuditUser>,
) {
  if (typeof log.entityId !== 'number') {
    return null;
  }

  if (isTimeEntryEntity(log.entityType)) {
    return timeEntryUserById.get(log.entityId) ?? null;
  }

  if (isUserEntity(log.entityType)) {
    return userById.get(log.entityId) ?? null;
  }

  return null;
}

function isTimeEntryEntity(entityType: string) {
  return entityType === 'TimeEntry' || entityType === 'TIME_ENTRY';
}

function isUserEntity(entityType: string) {
  return entityType === 'User' || entityType === 'USER';
}
