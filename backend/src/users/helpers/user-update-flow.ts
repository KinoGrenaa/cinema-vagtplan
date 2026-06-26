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
  const user = await findRequiredUser(prisma, id);

  if (currentUser) {
    ensureCanModifyTargetUser(currentUser, user);

    if (currentUser.role !== 'MASTER' && data.role === 'MASTER') {
      throw new ForbiddenException(
        'Kun master kan oprette eller tildele master-rolle',
      );
    }
  }

  if (data.email) {
    await ensureUniqueUserEmail(
      prisma,
      data.email,
      'Der findes allerede en anden bruger med denne email',
      id,
    );
  }

  const nextRole = data.role || user.role;
  const nextCinemaId = await validateRoleCinema(
    prisma,
    nextRole,
    nextRole === 'MASTER' ? null : user.cinemaId,
  );

  const updateData = buildUserUpdateData(data, nextRole, nextCinemaId);

  if (data.password && data.password.trim() !== '') {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await auditLogsService.create({
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: updatedUser.id,
    description: `Opdaterede bruger ${updatedUser.firstName} ${updatedUser.lastName}`,
    userId: getActorUserId(currentUser),
    cinemaId: updatedUser.cinemaId,
  });

  return updatedUser;
}

export async function updateOwnProfileFlow(
  prisma: PrismaService,
  id: number,
  data: UpdateOwnProfileInput,
) {
  await findRequiredUser(prisma, id);

  if (data.email) {
    await ensureUniqueUserEmail(
      prisma,
      data.email,
      'Der findes allerede en anden bruger med denne email',
      id,
    );
  }

  const updateData = buildOwnProfileUpdateData(data);

  if (data.password && data.password.trim() !== '') {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  });
}

export async function updateThemeFlow(
  prisma: PrismaService,
  id: number,
  theme: string,
) {
  return prisma.user.update({
    where: { id },
    data: {
      theme,
    },
  });
}
