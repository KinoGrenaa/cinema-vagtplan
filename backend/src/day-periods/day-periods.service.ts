import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  DayPeriodCreateData,
  DayPeriodUpdateData,
} from './helpers/day-period-service-helpers';
import { createDayPeriod } from './helpers/day-period-create-flow';
import { findDayPeriods } from './helpers/day-period-read-flow';
import {
  archiveDayPeriod,
  reactivateDayPeriod,
} from './helpers/day-period-status-flow';
import { updateDayPeriod } from './helpers/day-period-update-flow';

@Injectable()
export class DayPeriodsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: AuthUser,
    includeArchived = false,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return findDayPeriods(this.prisma, user, includeArchived, selectedCinemaId);
  }

  async create(user: AuthUser, data: DayPeriodCreateData) {
    return createDayPeriod(this.prisma, user, data);
  }

  async update(
    user: AuthUser,
    id: number,
    data: DayPeriodUpdateData,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return updateDayPeriod(this.prisma, user, id, data, selectedCinemaId);
  }

  async remove(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return archiveDayPeriod(this.prisma, user, id, selectedCinemaId);
  }

  async reactivate(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return reactivateDayPeriod(this.prisma, user, id, selectedCinemaId);
  }
}
