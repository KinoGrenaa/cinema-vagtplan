import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AuditLogData = {
  action: string;
  entityType: string;
  entityId?: number;
  description?: string;
  userId?: number;
  cinemaId?: number;
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
  async findAll() {
    return this.prisma.auditLog.findMany({
      include: {
        user: true,
        cinema: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });
  }
}
