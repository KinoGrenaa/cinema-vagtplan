import { NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  ensureCanModifyTargetUser,
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

        if (currentUser) {
          ensureCanModifyTargetUser(
            currentUser,
            existingUser,
          );
        }

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
    action: 'DEACTIVATE_USER',
    entityType: 'User',
    entityId: deactivatedUser.id,
    description: `Deaktiverede bruger ${deactivatedUser.firstName} ${deactivatedUser.lastName}`,
    userId: getActorUserId(currentUser),
    cinemaId: deactivatedUser.cinemaId,
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

        if (currentUser) {
          ensureCanModifyTargetUser(
            currentUser,
            existingUser,
          );
        }

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
    action: 'REACTIVATE_USER',
    entityType: 'User',
    entityId: reactivatedUser.id,
    description: `Genaktiverede bruger ${reactivatedUser.firstName} ${reactivatedUser.lastName}`,
    userId: getActorUserId(currentUser),
    cinemaId: reactivatedUser.cinemaId,
  });

  return reactivatedUser;
}
