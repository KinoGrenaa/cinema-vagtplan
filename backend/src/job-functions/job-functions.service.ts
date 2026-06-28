import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  JobFunctionCreateData,
  JobFunctionUpdateData,
  UserJobFunctionAssignData,
} from './helpers/job-function-service-helpers';
import { createJobFunction } from './helpers/job-function-create-flow';
import { findJobFunctions } from './helpers/job-function-read-flow';
import {
  archiveJobFunction,
  reactivateJobFunction,
} from './helpers/job-function-status-flow';
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
