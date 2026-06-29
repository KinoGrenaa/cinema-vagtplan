import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { findMonthPlanDay, findMonthPlanDays } from './helpers/month-plan-read-flow';
import { upsertMonthPlanDay } from './helpers/month-plan-update-flow';

@Injectable()
export class MonthPlansService {
  constructor(private prisma: PrismaService) {}

  findMonth(user, year?: string, month?: string, cinemaId?: string) {
    return findMonthPlanDays(this.prisma, user, year, month, cinemaId);
  }

  findDay(user, date: string, cinemaId?: string) {
    return findMonthPlanDay(this.prisma, user, date, cinemaId);
  }

  upsertDay(user, date: string, body, cinemaId?: string) {
    return upsertMonthPlanDay(this.prisma, user, date, body, cinemaId);
  }
}
