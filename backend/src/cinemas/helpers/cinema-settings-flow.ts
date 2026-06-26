import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type UpdateCinemaSettingsData = {
  name?: string;
  logoUrl?: string | null;
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

function buildCinemaSettingsUpdateData(
  data: UpdateCinemaSettingsData,
  nextName: string | undefined,
) {
  return {
    name: nextName,
    logoUrl: data.logoUrl,
    allowShiftTradePool: data.allowShiftTradePool,
    allowShiftTradeDirect: data.allowShiftTradeDirect,
    aiEnabled: data.aiEnabled,
    payrollRulesEnabled: data.payrollRulesEnabled,
    clockInDeviationToleranceMinutes: data.clockInDeviationToleranceMinutes,
    clockOutDeviationToleranceMinutes: data.clockOutDeviationToleranceMinutes,
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
  };
}

export async function updateCinemaSettings(
  prisma: PrismaService,
  id: number,
  data: UpdateCinemaSettingsData,
) {
  const cinema = await prisma.cinema.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });

  if (!cinema) {
    throw new NotFoundException('Biograf blev ikke fundet');
  }

  const nextName = data.name !== undefined ? data.name.trim() : undefined;

  if (data.name !== undefined && !nextName) {
    throw new BadRequestException('Biografnavn mangler');
  }

  if (nextName && nextName !== cinema.name) {
    const existingCinema = await prisma.cinema.findFirst({
      where: {
        name: nextName,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCinema) {
      throw new BadRequestException(
        'Der findes allerede en biograf med dette navn',
      );
    }
  }

  return prisma.cinema.update({
    where: { id },
    data: buildCinemaSettingsUpdateData(data, nextName),
  });
}
