import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CinemaRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateCinemaUserDto } from './dto/update-cinema-user.dto';
import {
  ensureUniqueUserEmail,
} from './helpers/user-service-data-helpers';
import {
  AuthUser,
  getActorUserId,
} from './helpers/user-service-helpers';
import {
  lockUserWrite,
  withUserDirectoryWriteLock,
} from './helpers/user-write-lock';

const ADMIN_PERMISSIONS = {
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
} as const;

function resolveCinemaId(
  actor: AuthUser,
  selectedCinemaId?: number,
) {
  if (actor.role === 'MASTER') {
    if (!selectedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du redigerer brugeren',
      );
    }

    return selectedCinemaId;
  }

  if (!actor.cinemaId) {
    throw new ForbiddenException(
      'Din session mangler en aktiv biograf',
    );
  }

  return actor.cinemaId;
}

function normalizeOptionalText(
  value: string | null | undefined,
) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim() ?? '';

  return normalized || null;
}

function normalizeOptionalDate(
  value: string | null | undefined,
) {
  if (value === undefined) {
    return undefined;
  }

  return value ? new Date(value) : null;
}

function getMembershipData(
  body: UpdateCinemaUserDto,
) {
  const permissions =
    body.role === CinemaRole.ADMIN
      ? ADMIN_PERMISSIONS
      : {
          canManageSchedule:
            body.canManageSchedule,
          canManageUsers:
            body.canManageUsers,
          canManagePayroll:
            body.canManagePayroll,
          canManageLeaveRequests:
            body.canManageLeaveRequests,
          canManageCinemaSettings:
            body.canManageCinemaSettings,
          canSendBroadcastMessages:
            body.canSendBroadcastMessages,
        };

  return {
    role: body.role,
    employmentType: body.employmentType,
    hireDate: normalizeOptionalDate(
      body.hireDate,
    ),
    employeeNumber: normalizeOptionalText(
      body.employeeNumber,
    ),
    payrollEmployeeId: normalizeOptionalText(
      body.payrollEmployeeId,
    ),
    ...permissions,
  };
}

@Injectable()
export class UserCinemaProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService:
      AuditLogsService,
  ) {}

  async update(
    userId: number,
    body: UpdateCinemaUserDto,
    actor: AuthUser,
    selectedCinemaId?: number,
  ) {
    const cinemaId = resolveCinemaId(
      actor,
      selectedCinemaId,
    );
    const normalizedEmail = body.email.trim();
    const normalizedFirstName =
      body.firstName.trim();
    const normalizedLastName =
      body.lastName.trim();
    const normalizedPhone =
      body.phone?.trim() || null;

    const result =
      await withUserDirectoryWriteLock(
        this.prisma,
        async (transaction) => {
          const lockedUserId =
            await lockUserWrite(
              transaction,
              userId,
            );

          const user =
            await transaction.user.findUnique({
              where: {
                id: lockedUserId,
              },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                defaultCinemaId: true,
              },
            });

          if (!user) {
            throw new NotFoundException(
              'Bruger blev ikke fundet',
            );
          }

          if (user.role === 'MASTER') {
            throw new BadRequestException(
              'MASTER-brugere redigeres som systembrugere',
            );
          }

          const membership =
            await transaction.userCinemaMembership.findUnique({
              where: {
                userId_cinemaId: {
                  userId: lockedUserId,
                  cinemaId,
                },
              },
              select: {
                id: true,
                isActive: true,
                deactivatedAt: true,
              },
            });

          if (!membership) {
            throw new NotFoundException(
              'Brugeren er ikke tilknyttet denne biograf',
            );
          }

          await ensureUniqueUserEmail(
            transaction,
            normalizedEmail,
            'Der findes allerede en anden bruger med denne email',
            lockedUserId,
          );

          const updatedUser =
            await transaction.user.update({
              where: {
                id: lockedUserId,
              },
              data: {
                email: normalizedEmail,
                firstName:
                  normalizedFirstName,
                lastName:
                  normalizedLastName,
                phone: normalizedPhone,
              },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                defaultCinemaId: true,
              },
            });

          const updatedMembership =
            await transaction.userCinemaMembership.update({
              where: {
                userId_cinemaId: {
                  userId: lockedUserId,
                  cinemaId,
                },
              },
              data: getMembershipData(body),
              select: {
                role: true,
                employmentType: true,
                hireDate: true,
                employeeNumber: true,
                payrollEmployeeId: true,
                isActive: true,
                deactivatedAt: true,
                canManageSchedule: true,
                canManageUsers: true,
                canManagePayroll: true,
                canManageLeaveRequests: true,
                canManageCinemaSettings: true,
                canSendBroadcastMessages: true,
              },
            });

          return {
            user: updatedUser,
            membership: updatedMembership,
          };
        },
      );

    await this.auditLogsService.create({
      action: 'UPDATE_USER_CINEMA_PROFILE',
      entityType: 'UserCinemaMembership',
      entityId: result.user.id,
      description:
        `Opdaterede ${result.user.firstName} ` +
        `${result.user.lastName} i biograf ${cinemaId}`,
      userId: getActorUserId(actor),
      cinemaId,
    });

    return {
      ...result.user,
      cinemaId,
      role: result.membership.role,
      employmentType:
        result.membership.employmentType,
      hireDate:
        result.membership.hireDate,
      employeeNumber:
        result.membership.employeeNumber,
      payrollEmployeeId:
        result.membership.payrollEmployeeId,
      isActive:
        result.membership.isActive,
      deactivatedAt:
        result.membership.deactivatedAt,
      canManageSchedule:
        result.membership.canManageSchedule,
      canManageUsers:
        result.membership.canManageUsers,
      canManagePayroll:
        result.membership.canManagePayroll,
      canManageLeaveRequests:
        result.membership.canManageLeaveRequests,
      canManageCinemaSettings:
        result.membership.canManageCinemaSettings,
      canSendBroadcastMessages:
        result.membership.canSendBroadcastMessages,
      canManageAccount: true,
    };
  }
}
