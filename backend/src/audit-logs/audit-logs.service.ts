import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CurrentUser = {
  id?: number;
  sub?: number;
  role: string;
  cinemaId: number | null;
};

type AuditLogData = {
  action: string;
  entityType: string;
  entityId?: number;
  description?: string;
  userId?: number;
  cinemaId?: number | null;
};

type AuditUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type AuditLogForView = {
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

const auditLogSelect = {
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

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async create(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        userId: data.userId,
        cinemaId: data.cinemaId,
      },
    });
  }

  async findAll(currentUser: CurrentUser, selectedCinemaId?: number | null) {
    const logs = await this.prisma.auditLog.findMany({
      where: this.getAccessWhere(currentUser, selectedCinemaId),
      select: auditLogSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    return this.addSubjectUsers(logs);
  }

  async findByEntity(
    currentUser: CurrentUser,
    entityType: string,
    entityId: number,
    selectedCinemaId?: number | null,
  ) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...this.getAccessWhere(currentUser, selectedCinemaId),
        entityType,
        entityId,
      },
      select: auditLogSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.addSubjectUsers(logs);
  }

  private getAccessWhere(
    currentUser: CurrentUser,
    selectedCinemaId?: number | null,
  ) {
    if (currentUser.role === 'MASTER') {
      if (!selectedCinemaId || !Number.isFinite(selectedCinemaId)) {
        throw new BadRequestException('Vælg en aktiv biograf først.');
      }

      return {
        cinemaId: selectedCinemaId,
      };
    }

    if (!currentUser.cinemaId) {
      throw new ForbiddenException(
        'Du har ikke adgang til ændringshistorikken',
      );
    }

    return {
      cinemaId: currentUser.cinemaId,
    };
  }

  private async addSubjectUsers(logs: AuditLogForView[]) {
    const timeEntryIds = this.getEntityIds(
      logs.filter((log) => this.isTimeEntryEntity(log.entityType)),
    );

    const userIds = this.getEntityIds(
      logs.filter((log) => this.isUserEntity(log.entityType)),
    );

    const [timeEntries, users] = await Promise.all([
      timeEntryIds.length
        ? this.prisma.timeEntry.findMany({
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
        ? this.prisma.user.findMany({
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
      const subjectUser = this.getSubjectUser(log, timeEntryUserById, userById);

      return {
        ...log,
        subjectUser,
      };
    });
  }

  private getEntityIds(logs: AuditLogForView[]) {
    return Array.from(
      new Set(
        logs
          .map((log) => log.entityId)
          .filter(
            (entityId): entityId is number => typeof entityId === 'number',
          ),
      ),
    );
  }

  private getSubjectUser(
    log: AuditLogForView,
    timeEntryUserById: Map<number, AuditUser>,
    userById: Map<number, AuditUser>,
  ) {
    if (typeof log.entityId !== 'number') {
      return null;
    }

    if (this.isTimeEntryEntity(log.entityType)) {
      return timeEntryUserById.get(log.entityId) ?? null;
    }

    if (this.isUserEntity(log.entityType)) {
      return userById.get(log.entityId) ?? null;
    }

    return null;
  }

  private isTimeEntryEntity(entityType: string) {
    return entityType === 'TimeEntry' || entityType === 'TIME_ENTRY';
  }

  private isUserEntity(entityType: string) {
    return entityType === 'User' || entityType === 'USER';
  }
}
