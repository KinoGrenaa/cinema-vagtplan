import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CinemaRole,
  EmploymentType as PrismaEmploymentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  EmploymentType,
  ensureSameCinemaOrMaster,
  getActorUserId,
  UserRole,
} from './user-service-helpers';
import {
  getCreatePermissionData,
  validateRoleCinema,
} from './user-service-data-helpers';
import { withUserDirectoryWriteLock } from './user-write-lock';

export type CreateUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  employmentType?: EmploymentType;
  hireDate?: string | null;
  employeeNumber?: string | null;
  payrollEmployeeId?: string | null;
  cinemaId?: number | null;
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

function toCinemaRole(
  role: UserRole,
): CinemaRole {
  return role === 'ADMIN'
    ? CinemaRole.ADMIN
    : CinemaRole.EMPLOYEE;
}

function buildCinemaUserResponse(
  user: Record<string, any>,
  membership?: Record<string, any> | null,
  cinemaId?: number | null,
) {
  const {
    password: _password,
    ...safeUser
  } = user;

  if (!membership || !cinemaId) {
    return safeUser;
  }

  return {
    ...safeUser,
    role: membership.role,
    employmentType:
      membership.employmentType,
    hireDate:
      membership.hireDate ?? null,
    employeeNumber:
      membership.employeeNumber ?? null,
    payrollEmployeeId:
      membership.payrollEmployeeId ?? null,
    cinemaId,
    isActive:
      membership.isActive,
    deactivatedAt:
      membership.deactivatedAt ?? null,
    canManageSchedule:
      membership.canManageSchedule,
    canManageUsers:
      membership.canManageUsers,
    canManagePayroll:
      membership.canManagePayroll,
    canManageLeaveRequests:
      membership.canManageLeaveRequests,
    canManageCinemaSettings:
      membership.canManageCinemaSettings,
    canSendBroadcastMessages:
      membership.canSendBroadcastMessages,
    canManageAccount: true,
  };
}

function normalizeOptionalText(
  value: string | null | undefined,
) {
  const normalized =
    value?.trim() ?? '';

  return normalized || null;
}

function normalizeOptionalDate(
  value: string | null | undefined,
) {
  return value
    ? new Date(value)
    : null;
}

function buildMembershipData(
  role: UserRole,
  data: CreateUserInput,
) {
  const permissions =
    getCreatePermissionData(
      role,
      data,
    );

  return {
    role: toCinemaRole(role),
    employmentType:
      (data.employmentType ??
        'HOURLY') as PrismaEmploymentType,
    hireDate:
      normalizeOptionalDate(
        data.hireDate,
      ),
    employeeNumber:
      normalizeOptionalText(
        data.employeeNumber,
      ),
    payrollEmployeeId:
      normalizeOptionalText(
        data.payrollEmployeeId,
      ),
    ...permissions,
    isActive: true,
    deactivatedAt: null,
  };
}

function buildAccountData(
  data: CreateUserInput,
  role: UserRole,
  defaultCinemaId: number | null,
  hashedPassword: string,
) {
  return {
    email: data.email,
    password: hashedPassword,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    role,
    defaultCinemaId,
    isActive: true,
    deactivatedAt: null,
  };
}

export async function createUserFlow(
  prisma: PrismaService,
  auditLogsService:
    AuditLogsService,
  data: CreateUserInput,
  currentUser?: AuthUser,
) {
  const role =
    data.role ?? 'EMPLOYEE';

  if (currentUser) {
    ensureSameCinemaOrMaster(
      currentUser,
      data.cinemaId ?? null,
    );

    if (
      currentUser.role !== 'MASTER' &&
      role === 'MASTER'
    ) {
      throw new ForbiddenException(
        'Kun master kan oprette eller tildele master-rolle',
      );
    }
  }

  const hashedPassword =
    await bcrypt.hash(
      data.password,
      10,
    );

  const result =
    await withUserDirectoryWriteLock(
      prisma,
      async (transaction) => {
        const cinemaId =
          await validateRoleCinema(
            transaction,
            role,
            data.cinemaId,
          );

        const existingUser =
          await transaction.user.findUnique({
            where: {
              email: data.email,
            },
          });

        if (role === 'MASTER') {
          if (existingUser) {
            throw new BadRequestException(
              'Der findes allerede en bruger med denne email',
            );
          }

          const createdMaster =
            await transaction.user.create({
              data: buildAccountData(
                data,
                role,
                null,
                hashedPassword,
              ),
            });

          return {
            action: 'CREATE_USER',
            description:
              `Oprettede MASTER-bruger ` +
              `${createdMaster.firstName} ${createdMaster.lastName}`,
            auditCinemaId: null,
            user:
              buildCinemaUserResponse(
                createdMaster,
              ),
          };
        }

        if (!cinemaId) {
          throw new BadRequestException(
            'Biograf skal være et gyldigt ID',
          );
        }

        const membershipData =
          buildMembershipData(
            role,
            data,
          );

        if (existingUser) {
          if (
            existingUser.role ===
            'MASTER'
          ) {
            throw new BadRequestException(
              'MASTER-brugere kan ikke tilknyttes en almindelig biograf',
            );
          }

          const existingMembership =
            await transaction.userCinemaMembership.findUnique(
              {
                where: {
                  userId_cinemaId: {
                    userId:
                      existingUser.id,
                    cinemaId,
                  },
                },
                select: {
                  id: true,
                  isActive: true,
                },
              },
            );

          if (
            existingMembership?.isActive
          ) {
            throw new BadRequestException(
              'Brugeren er allerede tilknyttet denne biograf',
            );
          }

          if (existingMembership) {
            throw new BadRequestException(
              'Brugeren findes allerede i denne biograf og skal genaktiveres',
            );
          }

          const membership =
            await transaction.userCinemaMembership.create(
              {
                data: {
                  userId:
                    existingUser.id,
                  cinemaId,
                  ...membershipData,
                },
              },
            );

          const linkedUser =
            existingUser.defaultCinemaId
              ? existingUser
              : await transaction.user.update({
                  where: {
                    id:
                      existingUser.id,
                  },
                  data: {
                    defaultCinemaId:
                      cinemaId,
                  },
                });

          return {
            action:
              'LINK_EXISTING_USER_TO_CINEMA',
            description:
              `Tilknyttede eksisterende bruger ` +
              `${linkedUser.firstName} ${linkedUser.lastName} ` +
              `til biograf ${cinemaId}`,
            auditCinemaId: cinemaId,
            user:
              buildCinemaUserResponse(
                linkedUser,
                membership,
                cinemaId,
              ),
          };
        }

        const createdUser =
          await transaction.user.create({
            data: buildAccountData(
              data,
              role,
              cinemaId,
              hashedPassword,
            ),
          });

        const membership =
          await transaction.userCinemaMembership.create(
            {
              data: {
                userId:
                  createdUser.id,
                cinemaId,
                ...membershipData,
              },
            },
          );

        return {
          action: 'CREATE_USER',
          description:
            `Oprettede bruger ` +
            `${createdUser.firstName} ${createdUser.lastName}`,
          auditCinemaId: cinemaId,
          user:
            buildCinemaUserResponse(
              createdUser,
              membership,
              cinemaId,
            ),
        };
      },
    );

  await auditLogsService.create({
    action: result.action,
    entityType: 'User',
    entityId: result.user.id,
    description:
      result.description,
    userId:
      getActorUserId(currentUser),
    cinemaId:
      result.auditCinemaId,
  });

  return result.user;
}
