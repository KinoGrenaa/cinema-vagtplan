import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensureCinemaNameAvailable,
  findCinemaForWrite,
  normalizeCinemaLogoUrl,
  normalizeCinemaName,
  withCinemaWriteLock,
} from './cinema-write-access';

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
  payrollPeriodModel?:
    | 'CALENDAR_MONTH'
    | 'FIXED_DAY_TO_DAY'
    | 'BIWEEKLY';
  payrollPeriodStartDay?: number;
  payrollPeriodEndDay?: number;
  payrollPeriodAnchorDate?: Date | null;
  payrollPayoutRule?:
    | 'LAST_WEEKDAY_OF_MONTH'
    | 'FIXED_DAY_OF_MONTH';
  payrollPayoutDay?: number;
};

function setDefinedCinemaSettings(
  target: Prisma.CinemaUncheckedUpdateInput,
  data: UpdateCinemaSettingsData,
) {
  const fields: Array<
    keyof UpdateCinemaSettingsData
  > = [
    'allowShiftTradePool',
    'allowShiftTradeDirect',
    'aiEnabled',
    'payrollRulesEnabled',
    'clockInDeviationToleranceMinutes',
    'clockOutDeviationToleranceMinutes',
    'requireNoteForClockInDeviation',
    'requireNoteForClockOutDeviation',
    'requireNoteForManualEntry',
    'payrollOvertimeEnabled',
    'plannedOvertimeEnabled',
    'dailyOvertimeEnabled',
    'weeklyOvertimeEnabled',
    'dailyOvertimeThreshold',
    'weeklyOvertimeThreshold',
    'payrollPeriodModel',
    'payrollPeriodStartDay',
    'payrollPeriodEndDay',
    'payrollPeriodAnchorDate',
    'payrollPayoutRule',
    'payrollPayoutDay',
  ];

  for (const field of fields) {
    const value = data[field];

    if (value !== undefined) {
      (target as Record<string, unknown>)[field] =
        value;
    }
  }
}

export async function updateCinemaSettings(
  prisma: PrismaService,
  id: number,
  data: UpdateCinemaSettingsData,
) {
  const nextName =
    data?.name === undefined
      ? undefined
      : normalizeCinemaName(data.name);
  const nextLogoUrl =
    data?.logoUrl === undefined
      ? undefined
      : normalizeCinemaLogoUrl(
          data.logoUrl,
        );

  return withCinemaWriteLock(
    prisma,
    async (transaction) => {
      const cinema = await findCinemaForWrite(
        transaction,
        id,
      );

      if (
        nextName !== undefined &&
        nextName !== cinema.name
      ) {
        await ensureCinemaNameAvailable(
          transaction,
          nextName,
          cinema.id,
        );
      }

      const updateData: Prisma.CinemaUncheckedUpdateInput =
        {};

      if (nextName !== undefined) {
        updateData.name = nextName;
      }

      if (nextLogoUrl !== undefined) {
        updateData.logoUrl = nextLogoUrl;
      }

      setDefinedCinemaSettings(
        updateData,
        data,
      );

      return transaction.cinema.update({
        where: {
          id: cinema.id,
        },
        data: updateData,
      });
    },
  );
}
