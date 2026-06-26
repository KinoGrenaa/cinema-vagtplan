import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuthUser,
  EmploymentType,
  ensureCanModifyTargetUser,
  ensureSameCinemaOrMaster,
  getActorUserId,
  UserRole,
} from './helpers/user-service-helpers';
import {
  buildOwnProfileUpdateData,
  buildUserUpdateData,
  ensureCinemaExists,
  ensureUniqueUserEmail,
  findRequiredUser,
  getCreatePermissionData,
  validateRoleCinema,
} from './helpers/user-service-data-helpers';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(currentUser: AuthUser, selectedCinemaId?: number) {
    if (currentUser.role === 'MASTER') {
      if (selectedCinemaId) {
        await ensureCinemaExists(this.prisma, selectedCinemaId);
      }

      return this.prisma.user.findMany({
        where: selectedCinemaId
          ? {
              cinemaId: selectedCinemaId,
            }
          : {},
        include: {
          cinema: true,
        },
        orderBy: {
          firstName: 'asc',
        },
      });
    }

    if (!currentUser.cinemaId) {
      throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
    }

    const cinemaId = currentUser.cinemaId;

    return this.prisma.user.findMany({
      where: {
        cinemaId,
      },
      include: {
        cinema: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        isActive: true,
      },
    });
  }

  async findByEmailIncludingInactive(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findOwnProfile(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        cinemaId: true,
        profileImage: true,
        address: true,
        birthDate: true,
        emergencyPhone: true,
        skills: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Bruger blev ikke fundet');
    }

    return user;
  }

  async createUser(
    data: {
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
    },
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

    const cinemaId = await validateRoleCinema(this.prisma, role, data.cinemaId);

    await ensureUniqueUserEmail(
      this.prisma,
      data.email,
      'Der findes allerede en bruger med denne email',
    );

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const createdUser = await this.prisma.user.create({
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

    await this.auditLogsService.create({
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: createdUser.id,
      description: `Oprettede bruger ${createdUser.firstName} ${createdUser.lastName}`,
      userId: getActorUserId(currentUser),
      cinemaId: createdUser.cinemaId,
    });

    return createdUser;
  }

  async updateUser(
    id: number,
    data: {
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
    },
    currentUser?: AuthUser,
  ) {
    const user = await findRequiredUser(this.prisma, id);

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
        this.prisma,
        data.email,
        'Der findes allerede en anden bruger med denne email',
        id,
      );
    }

    const nextRole = data.role || user.role;
    const nextCinemaId = await validateRoleCinema(
      this.prisma,
      nextRole,
      nextRole === 'MASTER' ? null : user.cinemaId,
    );

    const updateData = buildUserUpdateData(data, nextRole, nextCinemaId);

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    await this.auditLogsService.create({
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: updatedUser.id,
      description: `Opdaterede bruger ${updatedUser.firstName} ${updatedUser.lastName}`,
      userId: getActorUserId(currentUser),
      cinemaId: updatedUser.cinemaId,
    });

    return updatedUser;
  }

  async deleteUser(id: number, currentUser?: AuthUser) {
    const existingUser = await findRequiredUser(this.prisma, id);

    if (currentUser) {
      ensureCanModifyTargetUser(currentUser, existingUser);
    }

    const deactivatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      action: 'DEACTIVATE_USER',
      entityType: 'User',
      entityId: deactivatedUser.id,
      description: `Deaktiverede bruger ${deactivatedUser.firstName} ${deactivatedUser.lastName}`,
      userId: getActorUserId(currentUser),
      cinemaId: deactivatedUser.cinemaId,
    });

    return deactivatedUser;
  }

  async reactivateUser(id: number, currentUser?: AuthUser) {
    const existingUser = await findRequiredUser(this.prisma, id);

    if (currentUser) {
      ensureCanModifyTargetUser(currentUser, existingUser);
    }

    const reactivatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        deactivatedAt: null,
      },
    });

    await this.auditLogsService.create({
      action: 'REACTIVATE_USER',
      entityType: 'User',
      entityId: reactivatedUser.id,
      description: `Genaktiverede bruger ${reactivatedUser.firstName} ${reactivatedUser.lastName}`,
      userId: getActorUserId(currentUser),
      cinemaId: reactivatedUser.cinemaId,
    });

    return reactivatedUser;
  }

  async updateOwnProfile(
    id: number,
    data: {
      email?: string;
      phone?: string;
      password?: string;
      profileImage?: string;
      address?: string;
      birthDate?: string | null;
      emergencyPhone?: string;
      skills?: string;
    },
  ) {
    await findRequiredUser(this.prisma, id);

    if (data.email) {
      await ensureUniqueUserEmail(
        this.prisma,
        data.email,
        'Der findes allerede en anden bruger med denne email',
        id,
      );
    }

    const updateData = buildOwnProfileUpdateData(data);

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async updateTheme(id: number, theme: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        theme,
      },
    });
  }
}
