import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type UserRole = 'MASTER' | 'ADMIN' | 'EMPLOYEE';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        cinema: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
    cinemaId: number;
  }) {
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
        cinemaId: data.cinemaId,
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
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: UserRole;
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
  ) {
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

    const updateData: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: UserRole;
      password?: string;
      profileImage?: string;
      address?: string;
      birthDate?: Date | null;
      emergencyPhone?: string;
      hireDate?: Date | null;
      skills?: string;
      notes?: string;
      canManageSchedule?: boolean;
      canManageUsers?: boolean;
      canManagePayroll?: boolean;
      canManageLeaveRequests?: boolean;
      canManageCinemaSettings?: boolean;
      canSendBroadcastMessages?: boolean;
    } = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      profileImage: data.profileImage,
      address: data.address,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      emergencyPhone: data.emergencyPhone,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      skills: data.skills,
      notes: data.notes,
      canManageSchedule: data.canManageSchedule,
      canManageUsers: data.canManageUsers,
      canManagePayroll: data.canManagePayroll,
      canManageLeaveRequests: data.canManageLeaveRequests,
      canManageCinemaSettings: data.canManageCinemaSettings,
      canSendBroadcastMessages: data.canSendBroadcastMessages,
    };

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

  async deleteUser(id: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) return null;

    await this.auditLogsService.create({
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: existingUser.id,
      description: `Slettede bruger ${existingUser.firstName} ${existingUser.lastName}`,
      cinemaId: existingUser.cinemaId,
    });

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async updateOwnProfile(
    id: number,
    data: {
      email: string;
      phone?: string;
      password?: string;
      profileImage?: string;
      address?: string;
      birthDate?: string | null;
      emergencyPhone?: string;
      skills?: string;
    },
  ) {
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

    const updateData: {
      email: string;
      phone?: string;
      password?: string;
      profileImage?: string;
      address?: string;
      birthDate?: Date | null;
      emergencyPhone?: string;
      skills?: string;
    } = {
      email: data.email,
      phone: data.phone,
      profileImage: data.profileImage,
      address: data.address,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      emergencyPhone: data.emergencyPhone,
      skills: data.skills,
    };

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async updateTheme(id: number, theme: string) {
    return this.prisma.user.update({
      where: { id },
      data: { theme },
    });
  }
}
