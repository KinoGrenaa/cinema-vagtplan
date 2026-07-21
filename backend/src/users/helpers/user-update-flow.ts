import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  EmploymentType,
  ensureCanModifyTargetUser,
  getActorUserId,
  UserRole,
} from './user-service-helpers';
import {
  buildOwnProfileUpdateData,
  buildUserUpdateData,
  ensureUniqueUserEmail,
  findRequiredUser,
  validateRoleCinema,
} from './user-service-data-helpers';
import { syncPrimaryUserCinemaMembership } from './user-cinema-membership-sync';
import {
  lockUserWrite,
  withUserDirectoryWriteLock,
  withUserWriteLock,
} from './user-write-lock';

export type UpdateUserInput = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  employmentType?: EmploymentType;
  password?: string;
  profileImage?: string;
  address?: string;
  birthDate?: string | null;
  emergencyPhone?: string;
  hireDate?: string | null;
  skills?: string;
  notes?: string;
  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

export type UpdateOwnProfileInput = {
  email?: string;
  phone?: string;
  password?: string;
  profileImage?: string;
  address?: string;
  birthDate?: string | null;
  emergencyPhone?: string;
  skills?: string;
};

export async function updateUserFlow(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  id: number,
  data: UpdateUserInput,
  currentUser?: AuthUser,
) {
  const hashedPassword =
    data.password &&
    data.password.trim() !== ''
      ? await bcrypt.hash(
          data.password,
          10,
        )
      : undefined;

  const updatedUser =
    await withUserDirectoryWriteLock(
      prisma,
      async (transaction) => {
        const userId = await lockUserWrite(
          transaction,
          id,
        );
        const user = await findRequiredUser(
          transaction,
          userId,
        );

        if (currentUser) {
          ensureCanModifyTargetUser(
            currentUser,
            user,
          );

          if (
            currentUser.role !== 'MASTER' &&
            data.role === 'MASTER'
          ) {
            throw new ForbiddenException(
              'Kun master kan oprette eller tildele master-rolle',
            );
          }
        }

        if (data.email) {
          await ensureUniqueUserEmail(
            transaction,
            data.email,
            'Der findes allerede en anden bruger med denne email',
            userId,
          );
        }

        const nextRole =
          data.role || user.role;
        const nextCinemaId =
          await validateRoleCinema(
            transaction,
            nextRole,
            nextRole === 'MASTER'
              ? null
              : user.cinemaId,
          );
        const updateData =
          buildUserUpdateData(
            data,
            nextRole,
            nextCinemaId,
          );

        if (hashedPassword !== undefined) {
          updateData.password =
            hashedPassword;
        }

        const nextUser =
          await transaction.user.update({
            where: {
              id: userId,
            },
            data: updateData,
          });

        await syncPrimaryUserCinemaMembership(
          transaction,
          {
            userId: nextUser.id,
            cinemaId:
              nextUser.cinemaId,
            isActive:
              nextUser.isActive,
          },
        );

        return nextUser;
      },
    );

  await auditLogsService.create({
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: updatedUser.id,
    description: `Opdaterede bruger ${updatedUser.firstName} ${updatedUser.lastName}`,
    userId: getActorUserId(
      currentUser,
    ),
    cinemaId: updatedUser.cinemaId,
  });

  return updatedUser;
}

export async function updateOwnProfileFlow(
  prisma: PrismaService,
  id: number,
  data: UpdateOwnProfileInput,
) {
  const hashedPassword =
    data.password &&
    data.password.trim() !== ''
      ? await bcrypt.hash(
          data.password,
          10,
        )
      : undefined;

  return withUserDirectoryWriteLock(
    prisma,
    async (transaction) => {
      const userId = await lockUserWrite(
        transaction,
        id,
      );

      await findRequiredUser(
        transaction,
        userId,
      );

      if (data.email) {
        await ensureUniqueUserEmail(
          transaction,
          data.email,
          'Der findes allerede en anden bruger med denne email',
          userId,
        );
      }

      const updateData =
        buildOwnProfileUpdateData(
          data,
        );

      if (hashedPassword !== undefined) {
        updateData.password =
          hashedPassword;
      }

      return transaction.user.update({
        where: {
          id: userId,
        },
        data: updateData,
      });
    },
  );
}

export async function updateThemeFlow(
  prisma: PrismaService,
  id: number,
  theme: string,
) {
  return withUserWriteLock(
    prisma,
    id,
    (
      transaction,
      userId,
    ) =>
      transaction.user.update({
        where: {
          id: userId,
        },
        data: {
          theme,
        },
      }),
  );
}
