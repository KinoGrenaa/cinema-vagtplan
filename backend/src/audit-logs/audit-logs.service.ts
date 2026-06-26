import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getAuditLogAccessWhere,
  type CurrentUser,
} from './helpers/audit-log-access';
import {
  addSubjectUsers,
  auditLogSelect,
} from './helpers/audit-log-subject-users';

type AuditLogData = {
  action: string;
  entityType: string;
  entityId?: number;
  description?: string;
  userId?: number;
  cinemaId?: number | null;
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
      where: getAuditLogAccessWhere(currentUser, selectedCinemaId),
      select: auditLogSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    return addSubjectUsers(this.prisma, logs);
  }

  async findByEntity(
    currentUser: CurrentUser,
    entityType: string,
    entityId: number,
    selectedCinemaId?: number | null,
  ) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...getAuditLogAccessWhere(currentUser, selectedCinemaId),
        entityType,
        entityId,
      },
      select: auditLogSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return addSubjectUsers(this.prisma, logs);
  }
}
