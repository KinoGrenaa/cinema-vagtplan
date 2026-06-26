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
    ensureSameCinemaOrMaster(currentUser, data.cinemaId ?? null);

    if (currentUser.role !== 'MASTER' && role === 'MASTER') {
      throw new ForbiddenException(
        'Kun master kan oprette eller tildele master-rolle',
      );
    }
  }

  const cinemaId = await validateRoleCinema(prisma, role, data.cinemaId);

  await ensureUniqueUserEmail(
    prisma,
    data.email,
    'Der findes allerede en bruger med denne email',
  );

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const createdUser = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role,
      employmentType: data.employmentType || 'HOURLY',
      cinemaId,
      ...getCreatePermissionData(role, data),
      isActive: true,
      deactivatedAt: null,
    },
  });

  await auditLogsService.create({
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: createdUser.id,
    description: `Oprettede bruger ${createdUser.firstName} ${createdUser.lastName}`,
    userId: getActorUserId(currentUser),
    cinemaId: createdUser.cinemaId,
  });

  return createdUser;
}
