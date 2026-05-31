import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UpdateCinemaSettingsData = {
  allowShiftTradePool?: boolean;
  allowShiftTradeDirect?: boolean;

  aiEnabled?: boolean;

  payrollRulesEnabled?: boolean;
  payrollOvertimeEnabled?: boolean;
  plannedOvertimeEnabled?: boolean;
  dailyOvertimeEnabled?: boolean;
  weeklyOvertimeEnabled?: boolean;
  dailyOvertimeThreshold?: number;
  weeklyOvertimeThreshold?: number;
};

@Injectable()
export class CinemasService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    return cinema;
  }

  async updateSettings(id: number, data: UpdateCinemaSettingsData) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id },
    });

    if (!cinema) {
      throw new NotFoundException('Biograf blev ikke fundet');
    }

    return this.prisma.cinema.update({
      where: { id },
      data: {
        allowShiftTradePool: data.allowShiftTradePool,
        allowShiftTradeDirect: data.allowShiftTradeDirect,

        aiEnabled: data.aiEnabled,

        payrollRulesEnabled: data.payrollRulesEnabled,
        payrollOvertimeEnabled: data.payrollOvertimeEnabled,
        plannedOvertimeEnabled: data.plannedOvertimeEnabled,
        dailyOvertimeEnabled: data.dailyOvertimeEnabled,
        weeklyOvertimeEnabled: data.weeklyOvertimeEnabled,
        dailyOvertimeThreshold: data.dailyOvertimeThreshold,
        weeklyOvertimeThreshold: data.weeklyOvertimeThreshold,
      },
    });
  }
}
