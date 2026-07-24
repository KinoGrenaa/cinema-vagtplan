import {
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  getActorUserId,
  UserRole,
} from './user-service-helpers';
import {
  buildOwnProfileUpdateData,
  buildUserUpdateData,
  ensureUniqueUserEmail,
  findRequiredUser,
} from './user-service-data-helpers';
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
  password?: string;
  profileImage?: string;
  address?: string;
  birthDate?: string | null;
  emergencyPhone?: string;
  skills?: string;
  notes?: string;
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
        const userId =
          await lockUserWrite(
            transaction,
            id,
          );
        const user =
          await findRequiredUser(
            transaction,
            userId,
          );

        if (
          currentUser?.role !==
            'MASTER' ||
          user.role !== 'MASTER'
        ) {
          throw new ForbiddenException(
            'Almindelige brugere redigeres i den valgte biograf',
          );
        }

        if (
          data.role !== undefined &&
          data.role !== 'MASTER'
        ) {
          throw new ForbiddenException(
            'MASTER-rollen kan ikke ændres til en biografrolle',
          );
        }

        if (data.email) {
          await ensureUniqueUserEmail(
            transaction,
            data.email,
            'Der findes allerede en anden bruger med denne email',
            userId,
          );
        }

        const updateData =
          buildUserUpdateData(data);

        if (
          hashedPassword !==
          undefined
        ) {
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

  await auditLogsService.create({
    action: 'UPDATE_MASTER_USER',
    entityType: 'User',
    entityId: updatedUser.id,
    description:
      `Opdaterede MASTER-bruger ` +
      `${updatedUser.firstName} ${updatedUser.lastName}`,
    userId:
      getActorUserId(currentUser),
    cinemaId: null,
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
      const userId =
        await lockUserWrite(
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
        buildOwnProfileUpdateData(data);

      if (
        hashedPassword !== undefined
      ) {
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
    (transaction, userId) =>
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
