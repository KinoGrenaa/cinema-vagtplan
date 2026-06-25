import {
  BadRequestException,
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

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  private async ensureCinemaExists(cinemaId: number) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
      select: { id: true },
    });

    if (!cinema) {
      throw new BadRequestException('Den valgte biograf blev ikke fundet');
    }
  }

  private async validateRoleCinema(role: UserRole, cinemaId?: number | null) {
    if (role === 'MASTER') {
      return null;
    }

    if (!cinemaId) {
      throw new BadRequestException(
        'Admin og medarbejdere skal tilknyttes en biograf',
      );
    }

    await this.ensureCinemaExists(cinemaId);

    return cinemaId;
  }

  async findAll(currentUser: AuthUser, selectedCinemaId?: number) {
    if (currentUser.role === 'MASTER') {
      if (selectedCinemaId) {
        await this.ensureCinemaExists(selectedCinemaId);
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

    const cinemaId = await this.validateRoleCinema(role, data.cinemaId);

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Der findes allerede en bruger med denne email',
      );
    }

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
        canManageSchedule:
          role === 'MASTER' ? true : (data.canManageSchedule ?? false),
        canManageUsers:
          role === 'MASTER' ? true : (data.canManageUsers ?? false),
        canManagePayroll:
          role === 'MASTER' ? true : (data.canManagePayroll ?? false),
        canManageLeaveRequests:
          role === 'MASTER' ? true : (data.canManageLeaveRequests ?? false),
        canManageCinemaSettings:
          role === 'MASTER' ? true : (data.canManageCinemaSettings ?? false),
        canSendBroadcastMessages:
          role === 'MASTER' ? true : (data.canSendBroadcastMessages ?? false),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Bruger blev ikke fundet');
    }

    if (currentUser) {
      ensureCanModifyTargetUser(currentUser, user);

      if (currentUser.role !== 'MASTER' && data.role === 'MASTER') {
        throw new ForbiddenException(
          'Kun master kan oprette eller tildele master-rolle',
        );
      }
    }

    if (data.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          id: {
            not: id,
          },
        },
      });

      if (existingUser) {
        throw new BadRequestException(
          'Der findes allerede en anden bruger med denne email',
        );
      }
    }

    const nextRole = data.role || user.role;
    const nextCinemaId = await this.validateRoleCinema(
      nextRole,
      nextRole === 'MASTER' ? null : user.cinemaId,
    );

    const updateData: any = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role !== undefined) updateData.role = data.role;
    updateData.cinemaId = nextCinemaId;
    if (data.employmentType !== undefined) {
      updateData.employmentType = data.employmentType;
    }
    if (data.profileImage !== undefined) {
      updateData.profileImage = data.profileImage;
    }
    if (data.address !== undefined) updateData.address = data.address;
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.emergencyPhone !== undefined) {
      updateData.emergencyPhone = data.emergencyPhone;
    }
    if (data.hireDate !== undefined) {
      updateData.hireDate = data.hireDate ? new Date(data.hireDate) : null;
    }
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.canManageSchedule !== undefined) {
      updateData.canManageSchedule =
        nextRole === 'MASTER' ? true : data.canManageSchedule;
    }
    if (data.canManageUsers !== undefined) {
      updateData.canManageUsers =
        nextRole === 'MASTER' ? true : data.canManageUsers;
    }
    if (data.canManagePayroll !== undefined) {
      updateData.canManagePayroll =
        nextRole === 'MASTER' ? true : data.canManagePayroll;
    }
    if (data.canManageLeaveRequests !== undefined) {
      updateData.canManageLeaveRequests =
        nextRole === 'MASTER' ? true : data.canManageLeaveRequests;
    }
    if (data.canManageCinemaSettings !== undefined) {
      updateData.canManageCinemaSettings =
        nextRole === 'MASTER' ? true : data.canManageCinemaSettings;
    }
    if (data.canSendBroadcastMessages !== undefined) {
      updateData.canSendBroadcastMessages =
        nextRole === 'MASTER' ? true : data.canSendBroadcastMessages;
    }

    if (nextRole === 'MASTER') {
      updateData.canManageSchedule = true;
      updateData.canManageUsers = true;
      updateData.canManagePayroll = true;
      updateData.canManageLeaveRequests = true;
      updateData.canManageCinemaSettings = true;
      updateData.canSendBroadcastMessages = true;
    }

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
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Bruger blev ikke fundet');
    }

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
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Bruger blev ikke fundet');
    }

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
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Bruger blev ikke fundet');
    }

    if (data.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          id: {
            not: id,
          },
        },
      });

      if (existingUser) {
        throw new BadRequestException(
          'Der findes allerede en anden bruger med denne email',
        );
      }
    }

    const updateData: any = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profileImage !== undefined) {
      updateData.profileImage = data.profileImage;
    }
    if (data.address !== undefined) updateData.address = data.address;
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.emergencyPhone !== undefined) {
      updateData.emergencyPhone = data.emergencyPhone;
    }
    if (data.skills !== undefined) updateData.skills = data.skills;

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
