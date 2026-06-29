import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  ScheduleTemplateAssignmentData,
  ScheduleTemplateCreateData,
  ScheduleTemplateDayData,
  ScheduleTemplateJobFunctionData,
  ScheduleTemplateUpdateData,
} from './helpers/schedule-template-service-helpers';
import {
  addScheduleTemplateAssignment,
  removeScheduleTemplateAssignment,
} from './helpers/schedule-template-assignment-flow';
import { createScheduleTemplate } from './helpers/schedule-template-create-flow';
import {
  findScheduleTemplateDays,
  upsertScheduleTemplateDay,
} from './helpers/schedule-template-day-flow';
import {
  addScheduleTemplateJobFunction,
  removeScheduleTemplateJobFunction,
  updateScheduleTemplateJobFunction,
} from './helpers/schedule-template-job-function-flow';
import {
  findScheduleTemplates,
  getScheduleTemplate,
} from './helpers/schedule-template-read-flow';
import {
  archiveScheduleTemplate,
  reactivateScheduleTemplate,
} from './helpers/schedule-template-status-flow';
import { updateScheduleTemplate } from './helpers/schedule-template-update-flow';

@Injectable()
export class ScheduleTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: AuthUser,
    includeArchived = false,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return findScheduleTemplates(
      this.prisma,
      user,
      includeArchived,
      selectedCinemaId,
    );
  }

  async findOne(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return getScheduleTemplate(this.prisma, user, id, selectedCinemaId);
  }

  async create(user: AuthUser, data: ScheduleTemplateCreateData) {
    return createScheduleTemplate(this.prisma, user, data);
  }

  async update(
    user: AuthUser,
    id: number,
    data: ScheduleTemplateUpdateData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return updateScheduleTemplate(
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
    return archiveScheduleTemplate(this.prisma, user, id, selectedCinemaId);
  }

  async reactivate(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return reactivateScheduleTemplate(this.prisma, user, id, selectedCinemaId);
  }

  async findDays(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return findScheduleTemplateDays(this.prisma, user, id, selectedCinemaId);
  }

  async upsertDay(
    user: AuthUser,
    id: number,
    weekday: number,
    data: ScheduleTemplateDayData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return upsertScheduleTemplateDay(
      this.prisma,
      user,
      id,
      weekday,
      data,
      selectedCinemaId,
    );
  }

  async addJobFunction(
    user: AuthUser,
    id: number,
    weekday: number,
    data: ScheduleTemplateJobFunctionData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return addScheduleTemplateJobFunction(
      this.prisma,
      user,
      id,
      weekday,
      data,
      selectedCinemaId,
    );
  }

  async updateJobFunction(
    user: AuthUser,
    id: number,
    templateJobFunctionId: number,
    data: ScheduleTemplateJobFunctionData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return updateScheduleTemplateJobFunction(
      this.prisma,
      user,
      id,
      templateJobFunctionId,
      data,
      selectedCinemaId,
    );
  }

  async removeJobFunction(
    user: AuthUser,
    id: number,
    templateJobFunctionId: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return removeScheduleTemplateJobFunction(
      this.prisma,
      user,
      id,
      templateJobFunctionId,
      selectedCinemaId,
    );
  }

  async addAssignment(
    user: AuthUser,
    id: number,
    templateJobFunctionId: number,
    data: ScheduleTemplateAssignmentData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return addScheduleTemplateAssignment(
      this.prisma,
      user,
      id,
      templateJobFunctionId,
      data,
      selectedCinemaId,
    );
  }

  async removeAssignment(
    user: AuthUser,
    id: number,
    templateJobFunctionId: number,
    assignmentId: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return removeScheduleTemplateAssignment(
      this.prisma,
      user,
      id,
      templateJobFunctionId,
      assignmentId,
      selectedCinemaId,
    );
  }
}
