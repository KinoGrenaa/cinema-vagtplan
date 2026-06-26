import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  ensureCanModifyTargetUser,
  getActorUserId,
} from './user-service-helpers';
import { findRequiredUser } from './user-service-data-helpers';

export async function deactivateUserFlow(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  id: number,
  currentUser?: AuthUser,
) {
  const existingUser = await findRequiredUser(prisma, id);

  if (currentUser) {
    ensureCanModifyTargetUser(currentUser, existingUser);
  }

  const deactivatedUser = await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  });

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
  const existingUser = await findRequiredUser(prisma, id);

  if (currentUser) {
    ensureCanModifyTargetUser(currentUser, existingUser);
  }

  const reactivatedUser = await prisma.user.update({
    where: { id },
    data: {
      isActive: true,
      deactivatedAt: null,
    },
  });

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
