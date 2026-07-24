import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createUserFlow,
  CreateUserInput,
} from './helpers/user-create-flow';
import { findUserCinemaMemberships } from './helpers/user-cinema-membership-read';
import {
  findManagedUserCinemaMemberships,
  updateManagedUserCinemaMemberships,
  updateManagedUserDefaultCinema,
} from './helpers/user-cinema-membership-management';
import {
  findAllUsers,
  findUserByEmail,
  findUserByEmailIncludingInactive,
  findUserOwnProfile,
} from './helpers/user-read-flow';
import {
  AuthUser,
  EmploymentType,
  UserRole,
} from './helpers/user-service-helpers';
import {
  deactivateUserFlow,
  reactivateUserFlow,
} from './helpers/user-status-flow';
import {
  updateOwnProfileFlow,
  UpdateOwnProfileInput,
  updateThemeFlow,
  updateUserFlow,
  UpdateUserInput,
} from './helpers/user-update-flow';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    currentUser: AuthUser,
    selectedCinemaId?: number,
  ) {
    return findAllUsers(
      this.prisma,
      currentUser,
      selectedCinemaId,
    );
  }

  async findByEmail(email: string) {
    return findUserByEmail(this.prisma, email);
  }

  async findByEmailIncludingInactive(email: string) {
    return findUserByEmailIncludingInactive(
      this.prisma,
      email,
    );
  }

  async findOwnProfile(id: number) {
    return findUserOwnProfile(this.prisma, id);
  }

  async findOwnCinemaMemberships(id: number) {
    return findUserCinemaMemberships(
      this.prisma,
      id,
    );
  }

  async findManagedCinemaMemberships(id: number) {
    return findManagedUserCinemaMemberships(
      this.prisma,
      id,
    );
  }

  async updateManagedCinemaMemberships(
    id: number,
    cinemaIds: number[],
    currentUser: AuthUser,
  ) {
    return updateManagedUserCinemaMemberships(
      this.prisma,
      this.auditLogsService,
      id,
      cinemaIds,
      currentUser,
    );
  }

  async updateManagedDefaultCinema(
    id: number,
    cinemaId: number,
    currentUser: AuthUser,
  ) {
    return updateManagedUserDefaultCinema(
      this.prisma,
      this.auditLogsService,
      id,
      cinemaId,
      currentUser,
    );
  }

  async createUser(
    data: CreateUserInput,
    currentUser?: AuthUser,
  ) {
    return createUserFlow(
      this.prisma,
      this.auditLogsService,
      data,
      currentUser,
    );
  }

  async updateUser(
    id: number,
    data: UpdateUserInput,
    currentUser?: AuthUser,
  ) {
    return updateUserFlow(
      this.prisma,
      this.auditLogsService,
      id,
      data,
      currentUser,
    );
  }

  async deleteUser(
    id: number,
    currentUser?: AuthUser,
  ) {
    return deactivateUserFlow(
      this.prisma,
      this.auditLogsService,
      id,
      currentUser,
    );
  }

  async reactivateUser(
    id: number,
    currentUser?: AuthUser,
  ) {
    return reactivateUserFlow(
      this.prisma,
      this.auditLogsService,
      id,
      currentUser,
    );
  }

  async updateOwnProfile(
    id: number,
    data: UpdateOwnProfileInput,
  ) {
    return updateOwnProfileFlow(
      this.prisma,
      id,
      data,
    );
  }

  async updateTheme(
    id: number,
    theme: string,
  ) {
    return updateThemeFlow(
      this.prisma,
      id,
      theme,
    );
  }
}
