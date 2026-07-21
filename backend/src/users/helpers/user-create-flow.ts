import { ForbiddenException } from '@nestjs/common';
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
  ensureUniqueUserEmail,
  getCreatePermissionData,
  validateRoleCinema,
} from './user-service-data-helpers';
import { syncPrimaryUserCinemaMembership } from './user-cinema-membership-sync';
import { withUserDirectoryWriteLock } from './user-write-lock';

export type CreateUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  employmentType?: EmploymentType;
  cinemaId?: number | null;
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

export async function createUserFlow(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  data: CreateUserInput,
  currentUser?: AuthUser,
) {
  const role = data.role || 'EMPLOYEE';

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

  const hashedPassword = await bcrypt.hash(
    data.password,
    10,
  );

  const createdUser =
    await withUserDirectoryWriteLock(
      prisma,
      async (transaction) => {
        const cinemaId =
          await validateRoleCinema(
            transaction,
            role,
            data.cinemaId,
          );

        await ensureUniqueUserEmail(
          transaction,
          data.email,
          'Der findes allerede en bruger med denne email',
        );

        const user =
          await transaction.user.create({
            data: {
              email: data.email,
              password: hashedPassword,
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              role,
              employmentType:
                data.employmentType ||
                'HOURLY',
              cinemaId,
              ...getCreatePermissionData(
                role,
                data,
              ),
              isActive: true,
              deactivatedAt: null,
            },
          });

        await syncPrimaryUserCinemaMembership(
          transaction,
          {
            userId: user.id,
            cinemaId: user.cinemaId,
            isActive: user.isActive,
          },
        );

        return user;
      },
    );

  await auditLogsService.create({
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: createdUser.id,
    description: `Oprettede bruger ${createdUser.firstName} ${createdUser.lastName}`,
    userId: getActorUserId(
      currentUser,
    ),
    cinemaId: createdUser.cinemaId,
  });

  return createdUser;
}
