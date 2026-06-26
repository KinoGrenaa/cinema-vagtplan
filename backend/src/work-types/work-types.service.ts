import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './helpers/work-type-service-helpers';
import { createWorkType } from './helpers/work-type-create-flow';
import { findWorkTypes } from './helpers/work-type-read-flow';
import {
  archiveWorkType,
  reactivateWorkType,
} from './helpers/work-type-status-flow';
import { updateWorkType } from './helpers/work-type-update-flow';

@Injectable()
export class WorkTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: AuthUser,
    includeArchived = false,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return findWorkTypes(
      this.prisma,
      user,
      includeArchived,
      selectedCinemaId,
    );
  }

  async create(
    user: AuthUser,
    data: {
      name: string;
      color?: string;
      payrollTypeId?: number | null;
      cinemaId?: CinemaContextValue;
    },
  ) {
    return createWorkType(this.prisma, user, data);
  }

  async update(
    user: AuthUser,
    id: number,
    data: {
      name?: string;
      color?: string;
      payrollTypeId?: number | null;
      cinemaId?: CinemaContextValue;
    },
    selectedCinemaId?: CinemaContextValue,
  ) {
    return updateWorkType(this.prisma, user, id, data, selectedCinemaId);
  }

  async remove(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return archiveWorkType(this.prisma, user, id, selectedCinemaId);
  }

  async reactivate(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return reactivateWorkType(this.prisma, user, id, selectedCinemaId);
  }
}
