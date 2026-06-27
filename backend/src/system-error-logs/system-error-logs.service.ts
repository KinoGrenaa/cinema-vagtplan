import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  getSystemErrorLogRetentionCutoffs,
  SYSTEM_ERROR_LOG_RETENTION_POLICY,
} from './system-error-log-retention';

type SystemErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
type SystemErrorStatus = 'NEW' | 'SEEN' | 'RESOLVED' | 'IGNORED';

type SystemErrorLogRow = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  severity: SystemErrorSeverity;
  status: SystemErrorStatus;
  source: string;
  method: string | null;
  path: string | null;
  action: string | null;
  message: string;
  technicalMessage: string | null;
  stack: string | null;
  correlationId: string | null;
  statusCode: number | null;
  userId: number | null;
  userRole: string | null;
  cinemaId: number | null;
  metadata: unknown;
  resolvedAt: Date | null;
  resolvedByUserId: number | null;
  resolutionNote: string | null;
};

type SystemErrorLogListRow = SystemErrorLogRow & {
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  cinemaName: string | null;
  resolvedByFirstName: string | null;
  resolvedByLastName: string | null;
  resolvedByEmail: string | null;
};

type SystemErrorRetentionSummaryRow = {
  totalCount: number;
  eligibleForCleanupCount: number;
  activeEligibleCount: number;
  resolvedEligibleCount: number;
  criticalEligibleCount: number;
  oldestCreatedAt: Date | null;
  newestCreatedAt: Date | null;
};

type CreateSystemErrorLogData = {
  severity?: SystemErrorSeverity;
  status?: SystemErrorStatus;
  source?: string;
  method?: string | null;
  path?: string | null;
  action?: string | null;
  message: string;
  technicalMessage?: string | null;
  stack?: string | null;
  correlationId?: string | null;
  statusCode?: number | null;
  userId?: number | null;
  userRole?: string | null;
  cinemaId?: number | null;
  metadata?: unknown;
};

type FindSystemErrorLogsFilters = {
  severity?: string;
  status?: string;
  cinemaId?: number;
  take?: number;
};

const VALID_SEVERITIES = new Set(['INFO', 'WARNING', 'ERROR', 'CRITICAL']);
const VALID_STATUSES = new Set(['NEW', 'SEEN', 'RESOLVED', 'IGNORED']);

function getRequiredPositiveId(value: unknown, message: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }

  return id;
}

function normalizeSeverity(value?: string): SystemErrorSeverity | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toUpperCase() as SystemErrorSeverity;

  if (!VALID_SEVERITIES.has(normalized)) {
    throw new BadRequestException('Severity skal være gyldig');
  }

  return normalized;
}

function normalizeStatus(value?: string): SystemErrorStatus | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toUpperCase() as SystemErrorStatus;

  if (!VALID_STATUSES.has(normalized)) {
    throw new BadRequestException('Status skal være gyldig');
  }

  return normalized;
}

function getSafeTake(value?: number) {
  if (value === undefined) {
    return 200;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException('Antal skal være et positivt heltal');
  }

  return Math.min(value, 500);
}

function getSeverityForStatusCode(
  statusCode?: number | null,
): SystemErrorSeverity {
  if (!statusCode || statusCode >= 500) {
    return 'ERROR';
  }

  if (statusCode === 403) {
    return 'WARNING';
  }

  return 'INFO';
}

function getErrorMessage(error: unknown) {
  if (error instanceof HttpException) {
    const response = error.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return message.join(', ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ukendt serverfejl';
}

function getTechnicalMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error instanceof HttpException) {
    const response = error.getResponse();
    return typeof response === 'string' ? response : JSON.stringify(response);
  }

  return String(error);
}

function getRequestCorrelationId(request: any) {
  const headerValue =
    request?.headers?.['x-correlation-id'] ?? request?.headers?.['x-request-id'];

  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? null;
  }

  if (typeof headerValue === 'string' && headerValue.trim() !== '') {
    return headerValue;
  }

  return null;
}

function normalizeRetentionSummaryRow(row?: SystemErrorRetentionSummaryRow) {
  const totalCount = Number(row?.totalCount ?? 0);
  const eligibleForCleanupCount = Number(row?.eligibleForCleanupCount ?? 0);

  return {
    totalCount,
    eligibleForCleanupCount,
    keepCount: Math.max(totalCount - eligibleForCleanupCount, 0),
    activeEligibleCount: Number(row?.activeEligibleCount ?? 0),
    resolvedEligibleCount: Number(row?.resolvedEligibleCount ?? 0),
    criticalEligibleCount: Number(row?.criticalEligibleCount ?? 0),
    oldestCreatedAt: row?.oldestCreatedAt ?? null,
    newestCreatedAt: row?.newestCreatedAt ?? null,
  };
}

@Injectable()
export class SystemErrorLogsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSystemErrorLogData) {
    const severity = data.severity ?? 'ERROR';
    const status = data.status ?? 'NEW';
    const source = data.source ?? 'backend';
    const metadataJson =
      data.metadata === undefined ? null : JSON.stringify(data.metadata);

    const rows = await this.prisma.$queryRaw<SystemErrorLogRow[]>(Prisma.sql`
      INSERT INTO "SystemErrorLog" (
        "severity",
        "status",
        "source",
        "method",
        "path",
        "action",
        "message",
        "technicalMessage",
        "stack",
        "correlationId",
        "statusCode",
        "userId",
        "userRole",
        "cinemaId",
        "metadata"
      )
      VALUES (
        ${severity},
        ${status},
        ${source},
        ${data.method ?? null},
        ${data.path ?? null},
        ${data.action ?? null},
        ${data.message},
        ${data.technicalMessage ?? null},
        ${data.stack ?? null},
        ${data.correlationId ?? null},
        ${data.statusCode ?? null},
        ${data.userId ?? null},
        ${data.userRole ?? null},
        ${data.cinemaId ?? null},
        ${metadataJson}::jsonb
      )
      RETURNING *
    `);

    return rows[0];
  }

  async createFromRequestError(params: {
    error: unknown;
    request: any;
    statusCode: number;
  }) {
    const user = params.request?.user;
    const method = params.request?.method ?? null;
    const path =
      params.request?.originalUrl ??
      params.request?.url ??
      params.request?.path ??
      null;

    return this.create({
      severity: getSeverityForStatusCode(params.statusCode),
      source: 'backend',
      method,
      path,
      action: method && path ? `${method} ${path}` : null,
      message: getErrorMessage(params.error),
      technicalMessage: getTechnicalMessage(params.error),
      stack: params.error instanceof Error ? params.error.stack ?? null : null,
      correlationId: getRequestCorrelationId(params.request),
      statusCode: params.statusCode,
      userId: user?.sub ? Number(user.sub) : null,
      userRole: user?.role ?? null,
      cinemaId: user?.cinemaId ? Number(user.cinemaId) : null,
      metadata: {
        query: params.request?.query ?? null,
        params: params.request?.params ?? null,
      },
    });
  }

  async findAll(filters: FindSystemErrorLogsFilters) {
    const severity = normalizeSeverity(filters.severity);
    const status = normalizeStatus(filters.status);
    const take = getSafeTake(filters.take);
    const where: Prisma.Sql[] = [];

    if (severity) {
      where.push(Prisma.sql`logs."severity" = ${severity}`);
    }

    if (status) {
      where.push(Prisma.sql`logs."status" = ${status}`);
    }

    if (filters.cinemaId) {
      where.push(Prisma.sql`logs."cinemaId" = ${filters.cinemaId}`);
    }

    const whereSql = where.length
      ? Prisma.sql`WHERE ${Prisma.join(where, ' AND ')}`
      : Prisma.empty;

    return this.prisma.$queryRaw<SystemErrorLogListRow[]>(Prisma.sql`
      SELECT
        logs.*,
        users."firstName" AS "userFirstName",
        users."lastName" AS "userLastName",
        users."email" AS "userEmail",
        cinemas."name" AS "cinemaName",
        resolved_users."firstName" AS "resolvedByFirstName",
        resolved_users."lastName" AS "resolvedByLastName",
        resolved_users."email" AS "resolvedByEmail"
      FROM "SystemErrorLog" logs
      LEFT JOIN "User" users ON users."id" = logs."userId"
      LEFT JOIN "Cinema" cinemas ON cinemas."id" = logs."cinemaId"
      LEFT JOIN "User" resolved_users ON resolved_users."id" = logs."resolvedByUserId"
      ${whereSql}
      ORDER BY logs."createdAt" DESC
      LIMIT ${take}
    `);
  }

  async getRetentionSummary() {
    const evaluatedAt = new Date();
    const cutoffs = getSystemErrorLogRetentionCutoffs(evaluatedAt);

    const activeEligibleSql = Prisma.sql`
      logs."severity" <> 'CRITICAL'
      AND logs."status" IN ('NEW', 'SEEN')
      AND logs."createdAt" < ${cutoffs.activeStatusesBefore}
    `;

    const resolvedEligibleSql = Prisma.sql`
      logs."severity" <> 'CRITICAL'
      AND logs."status" IN ('RESOLVED', 'IGNORED')
      AND COALESCE(logs."resolvedAt", logs."updatedAt") < ${cutoffs.resolvedStatusesBefore}
    `;

    const criticalEligibleSql = Prisma.sql`
      logs."severity" = 'CRITICAL'
      AND logs."createdAt" < ${cutoffs.criticalSeverityBefore}
    `;

    const cleanupEligibleSql = Prisma.sql`
      (${activeEligibleSql})
      OR (${resolvedEligibleSql})
      OR (${criticalEligibleSql})
    `;

    const rows = await this.prisma.$queryRaw<SystemErrorRetentionSummaryRow[]>(
      Prisma.sql`
        SELECT
          COUNT(*)::integer AS "totalCount",
          COUNT(*) FILTER (WHERE ${cleanupEligibleSql})::integer AS "eligibleForCleanupCount",
          COUNT(*) FILTER (WHERE ${activeEligibleSql})::integer AS "activeEligibleCount",
          COUNT(*) FILTER (WHERE ${resolvedEligibleSql})::integer AS "resolvedEligibleCount",
          COUNT(*) FILTER (WHERE ${criticalEligibleSql})::integer AS "criticalEligibleCount",
          MIN(logs."createdAt") AS "oldestCreatedAt",
          MAX(logs."createdAt") AS "newestCreatedAt"
        FROM "SystemErrorLog" logs
      `,
    );

    return {
      policy: {
        ...SYSTEM_ERROR_LOG_RETENTION_POLICY,
        description: [
          'Aktive fejl med status NEW/SEEN beholdes i 180 dage.',
          'Løste eller ignorerede fejl beholdes i 90 dage efter afslutning.',
          'Kritiske fejl beholdes i 365 dage.',
        ],
        evaluatedAt,
        cutoffs,
      },
      summary: normalizeRetentionSummaryRow(rows[0]),
    };
  }

  async updateStatus(params: {
    id: number;
    status: SystemErrorStatus;
    changedByUserId?: number | null;
    note?: string | null;
  }) {
    const id = getRequiredPositiveId(
      params.id,
      'Fejl-log skal være et gyldigt ID',
    );
    const note =
      typeof params.note === 'string' && params.note.trim() !== ''
        ? params.note.trim()
        : null;
    const resolvedStatuses: SystemErrorStatus[] = ['RESOLVED', 'IGNORED'];
    const isResolvedStatus = resolvedStatuses.includes(params.status);

    if (isResolvedStatus && !note) {
      throw new BadRequestException('Intern note er påkrævet');
    }

    const rows = await this.prisma.$queryRaw<SystemErrorLogRow[]>(Prisma.sql`
      UPDATE "SystemErrorLog"
      SET
        "status" = ${params.status},
        "updatedAt" = CURRENT_TIMESTAMP,
        "resolvedAt" = ${isResolvedStatus ? new Date() : null},
        "resolvedByUserId" = ${
          isResolvedStatus ? params.changedByUserId ?? null : null
        },
        "resolutionNote" = ${isResolvedStatus ? note : null}
      WHERE "id" = ${id}
      RETURNING *
    `);

    if (!rows[0]) {
      throw new NotFoundException('Fejl-log blev ikke fundet');
    }

    return rows[0];
  }
}
