import { Injectable } from '@nestjs/common';

import {
  createCinema,
  type CreateCinemaData,
} from './helpers/cinema-create-flow';
import {
  findAllCinemas,
  findCinemaByIdOrThrow,
} from './helpers/cinema-read-flow';
import {
  type UpdateCinemaSettingsData,
  updateCinemaSettings,
} from './helpers/cinema-settings-flow';
import { updateCinemaLogo } from './helpers/cinema-logo-flow';
import {
  findDashboardWarningDecisions,
  recordDashboardWarningDecision,
} from './helpers/cinema-dashboard-warning-flow';
import type { DashboardWarningDecisionInput } from './helpers/cinema-dashboard-warning-input';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CinemasService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return findAllCinemas(this.prisma);
  }

  async create(data: CreateCinemaData) {
    return createCinema(this.prisma, data);
  }

  async findOne(id: number) {
    return findCinemaByIdOrThrow(this.prisma, id);
  }

  async updateSettings(id: number, data: UpdateCinemaSettingsData) {
    return updateCinemaSettings(this.prisma, id, data);
  }

  async updateLogo(id: number, logoUrl: string | null) {
    return updateCinemaLogo(this.prisma, id, logoUrl);
  }
  async findDashboardWarningDecisions(
    cinemaId: number,
    startDate: string,
    endDate: string,
  ) {
    return findDashboardWarningDecisions(
      this.prisma,
      cinemaId,
      startDate,
      endDate,
    );
  }

  async recordDashboardWarningDecision(
    cinemaId: number,
    userId: number,
    data: DashboardWarningDecisionInput,
  ) {
    return recordDashboardWarningDecision(
      this.prisma,
      cinemaId,
      userId,
      data,
    );
  }
}
