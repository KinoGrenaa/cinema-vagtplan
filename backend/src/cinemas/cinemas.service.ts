import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UpdateCinemaSettingsData = {
  allowShiftTradePool?: boolean;
  allowShiftTradeDirect?: boolean;

  aiEnabled?: boolean;

  payrollRulesEnabled?: boolean;
  clockInDeviationToleranceMinutes?: number;
  clockOutDeviationToleranceMinutes?: number;

  requireNoteForClockInDeviation?: boolean;
  requireNoteForClockOutDeviation?: boolean;
  requireNoteForManualEntry?: boolean;
  payrollOvertimeEnabled?: boolean;
  plannedOvertimeEnabled?: boolean;
  dailyOvertimeEnabled?: boolean;
  weeklyOvertimeEnabled?: boolean;
  dailyOvertimeThreshold?: number;
  weeklyOvertimeThreshold?: number;

  payrollPeriodModel?: 'CALENDAR_MONTH' | 'FIXED_DAY_TO_DAY' | 'BIWEEKLY';

  payrollPeriodStartDay?: number;
  payrollPeriodEndDay?: number;
  payrollPeriodAnchorDate?: Date | null;

  payrollPayoutRule?: 'LAST_WEEKDAY_OF_MONTH' | 'FIXED_DAY_OF_MONTH';

  payrollPayoutDay?: number;
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
        clockInDeviationToleranceMinutes: data.clockInDeviationToleranceMinutes,

        clockOutDeviationToleranceMinutes:
          data.clockOutDeviationToleranceMinutes,

        requireNoteForClockInDeviation: data.requireNoteForClockInDeviation,

        requireNoteForClockOutDeviation: data.requireNoteForClockOutDeviation,

        requireNoteForManualEntry: data.requireNoteForManualEntry,
        payrollOvertimeEnabled: data.payrollOvertimeEnabled,
        plannedOvertimeEnabled: data.plannedOvertimeEnabled,
        dailyOvertimeEnabled: data.dailyOvertimeEnabled,
        weeklyOvertimeEnabled: data.weeklyOvertimeEnabled,
        dailyOvertimeThreshold: data.dailyOvertimeThreshold,
        weeklyOvertimeThreshold: data.weeklyOvertimeThreshold,

        payrollPeriodModel: data.payrollPeriodModel,
        payrollPeriodStartDay: data.payrollPeriodStartDay,
        payrollPeriodEndDay: data.payrollPeriodEndDay,

        payrollPeriodAnchorDate:
          data.payrollPeriodAnchorDate !== undefined
            ? data.payrollPeriodAnchorDate
            : undefined,

        payrollPayoutRule: data.payrollPayoutRule,
        payrollPayoutDay: data.payrollPayoutDay,
      },
    });
  }
}
