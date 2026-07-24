import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  getActorUserId,
} from './user-service-helpers';
import {
  UserWriteDbClient,
  withUserWriteLock,
} from './user-write-lock';

async function findStatusTarget(
  prisma: UserWriteDbClient,
  id: number,
) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'Bruger blev ikke fundet',
    );
  }

  return user;
}

function ensureGlobalMasterStatusAccess(
  currentUser: AuthUser | undefined,
  targetRole: string,
) {
  if (
    currentUser?.role !== 'MASTER' ||
    targetRole !== 'MASTER'
  ) {
    throw new ForbiddenException(
      'Almindelige brugere deaktiveres i den enkelte biograf',
    );
  }
}

export async function deactivateUserFlow(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  id: number,
  currentUser?: AuthUser,
) {
  const deactivatedUser =
    await withUserWriteLock(
      prisma,
      id,
      async (transaction, userId) => {
        const existingUser =
          await findStatusTarget(
            transaction,
            userId,
          );

        ensureGlobalMasterStatusAccess(
          currentUser,
          existingUser.role,
        );

        return transaction.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            isActive: false,
            deactivatedAt: new Date(),
          },
        });
      },
    );

  await auditLogsService.create({
    action: 'DEACTIVATE_MASTER_USER',
    entityType: 'User',
    entityId: deactivatedUser.id,
    description:
      `Deaktiverede MASTER-bruger ` +
      `${deactivatedUser.firstName} ${deactivatedUser.lastName}`,
    userId: getActorUserId(currentUser),
    cinemaId: null,
  });

  return deactivatedUser;
}

export async function reactivateUserFlow(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  id: number,
  currentUser?: AuthUser,
) {
  const reactivatedUser =
    await withUserWriteLock(
      prisma,
      id,
      async (transaction, userId) => {
        const existingUser =
          await findStatusTarget(
            transaction,
            userId,
          );

        ensureGlobalMasterStatusAccess(
          currentUser,
          existingUser.role,
        );

        return transaction.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            isActive: true,
            deactivatedAt: null,
          },
        });
      },
    );

  await auditLogsService.create({
    action: 'REACTIVATE_MASTER_USER',
    entityType: 'User',
    entityId: reactivatedUser.id,
    description:
      `Genaktiverede MASTER-bruger ` +
      `${reactivatedUser.firstName} ${reactivatedUser.lastName}`,
    userId: getActorUserId(currentUser),
    cinemaId: null,
  });

  return reactivatedUser;
}
