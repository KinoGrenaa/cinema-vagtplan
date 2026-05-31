import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type UserRole = 'MASTER' | 'ADMIN' | 'EMPLOYEE';
type EmploymentType = 'HOURLY' | 'SALARIED';

type AuthUser = {
  sub?: number;
  id?: number;
  email: string;
  role: UserRole;
  cinemaId: number;
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  private ensureSameCinemaOrMaster(
    currentUser: AuthUser,
    targetCinemaId: number,
  ) {
    if (
      currentUser.role !== 'MASTER' &&
      currentUser.cinemaId !== targetCinemaId
    ) {
      throw new ForbiddenException('Du har ikke adgang til denne biograf');
    }
  }

  private ensureCanModifyTargetUser(
    currentUser: AuthUser,
    targetUser: { role: UserRole; cinemaId: number },
  ) {
    this.ensureSameCinemaOrMaster(currentUser, targetUser.cinemaId);

    if (currentUser.role !== 'MASTER' && targetUser.role === 'MASTER') {
      throw new ForbiddenException('Kun master kan ændre master-brugere');
    }
  }

  async findAll(currentUser: AuthUser) {
    return this.prisma.user.findMany({
      where:
        currentUser.role === 'MASTER'
          ? {}
          : {
              cinemaId: currentUser.cinemaId,
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

  async createUser(
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: UserRole;
      employmentType?: EmploymentType;
      cinemaId: number;
      canManageSchedule?: boolean;
      canManageUsers?: boolean;
      canManagePayroll?: boolean;
      canManageLeaveRequests?: boolean;
      canManageCinemaSettings?: boolean;
      canSendBroadcastMessages?: boolean;
    },
    currentUser?: AuthUser,
  ) {
    if (currentUser) {
      this.ensureSameCinemaOrMaster(currentUser, data.cinemaId);

      if (currentUser.role !== 'MASTER' && data.role === 'MASTER') {
        throw new ForbiddenException(
          'Kun master kan oprette eller tildele master-rolle',
        );
      }
    }

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
        role: data.role || 'EMPLOYEE',
        employmentType: data.employmentType || 'HOURLY',
        cinemaId: data.cinemaId,
        canManageSchedule: data.canManageSchedule ?? false,
        canManageUsers: data.canManageUsers ?? false,
        canManagePayroll: data.canManagePayroll ?? false,
        canManageLeaveRequests: data.canManageLeaveRequests ?? false,
        canManageCinemaSettings: data.canManageCinemaSettings ?? false,
        canSendBroadcastMessages: data.canSendBroadcastMessages ?? false,
        isActive: true,
        deactivatedAt: null,
      },
    });

    await this.auditLogsService.create({
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: createdUser.id,
      description: `Oprettede bruger ${createdUser.firstName} ${createdUser.lastName}`,
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
      this.ensureCanModifyTargetUser(currentUser, user);

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

    const updateData: any = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role !== undefined) updateData.role = data.role;
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
      updateData.canManageSchedule = data.canManageSchedule;
    }
    if (data.canManageUsers !== undefined) {
      updateData.canManageUsers = data.canManageUsers;
    }
    if (data.canManagePayroll !== undefined) {
      updateData.canManagePayroll = data.canManagePayroll;
    }
    if (data.canManageLeaveRequests !== undefined) {
      updateData.canManageLeaveRequests = data.canManageLeaveRequests;
    }
    if (data.canManageCinemaSettings !== undefined) {
      updateData.canManageCinemaSettings = data.canManageCinemaSettings;
    }
    if (data.canSendBroadcastMessages !== undefined) {
      updateData.canSendBroadcastMessages = data.canSendBroadcastMessages;
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
      this.ensureCanModifyTargetUser(currentUser, existingUser);
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
      this.ensureCanModifyTargetUser(currentUser, existingUser);
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
