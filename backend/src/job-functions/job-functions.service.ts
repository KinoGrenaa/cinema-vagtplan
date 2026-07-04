import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  JobFunctionCreateData,
  JobFunctionTimingRuleData,
  JobFunctionUpdateData,
  UserJobFunctionAssignData,
} from './helpers/job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  getRequiredJobFunctionCinemaId,
} from './helpers/job-function-service-helpers';
import { createJobFunction } from './helpers/job-function-create-flow';
import { findJobFunctions } from './helpers/job-function-read-flow';
import {
  archiveJobFunction,
  reactivateJobFunction,
} from './helpers/job-function-status-flow';
import {
  archiveJobFunctionTimingRule,
  findJobFunctionTimingRule,
  upsertJobFunctionTimingRule,
} from './helpers/job-function-timing-rule-flow';
import { updateJobFunction } from './helpers/job-function-update-flow';
import {
  assignUserJobFunction,
  findJobFunctionUsers,
  removeUserJobFunction,
} from './helpers/job-function-user-flow';

@Injectable()
export class JobFunctionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: AuthUser,
    includeArchived = false,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return findJobFunctions(
      this.prisma,
      user,
      includeArchived,
      selectedCinemaId,
    );
  }

  async findPayrollTypes(
    user: AuthUser,
    selectedCinemaId?: CinemaContextValue,
  ) {
    ensureJobFunctionAdmin(user);
    const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);

    return this.prisma.payrollType.findMany({
      where: {
        cinemaId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        payrollCode: true,
        exportCode: true,
        description: true,
        color: true,
        isDefault: true,
        isActive: true,
      },
    });
  }

  async create(user: AuthUser, data: JobFunctionCreateData) {
    return createJobFunction(this.prisma, user, data);
  }

  async update(
    user: AuthUser,
    id: number,
    data: JobFunctionUpdateData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return updateJobFunction(
      this.prisma,
      user,
      id,
      data,
      selectedCinemaId,
    );
  }

  async remove(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return archiveJobFunction(this.prisma, user, id, selectedCinemaId);
  }

  async reactivate(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return reactivateJobFunction(this.prisma, user, id, selectedCinemaId);
  }

  async getTimingRule(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
    includeInactive = false,
  ) {
    return findJobFunctionTimingRule(
      this.prisma,
      user,
      id,
      selectedCinemaId,
      includeInactive,
    );
  }

  async upsertTimingRule(
    user: AuthUser,
    id: number,
    data: JobFunctionTimingRuleData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return upsertJobFunctionTimingRule(
      this.prisma,
      user,
      id,
      data,
      selectedCinemaId,
    );
  }

  async removeTimingRule(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return archiveJobFunctionTimingRule(
      this.prisma,
      user,
      id,
      selectedCinemaId,
    );
  }

  async getUsers(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return findJobFunctionUsers(this.prisma, user, id, selectedCinemaId);
  }

  async assignUser(
    user: AuthUser,
    id: number,
    data: UserJobFunctionAssignData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return assignUserJobFunction(
      this.prisma,
      user,
      id,
      data,
      selectedCinemaId,
    );
  }

  async removeUser(
    user: AuthUser,
    id: number,
    userId: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return removeUserJobFunction(
      this.prisma,
      user,
      id,
      userId,
      selectedCinemaId,
    );
  }
}
