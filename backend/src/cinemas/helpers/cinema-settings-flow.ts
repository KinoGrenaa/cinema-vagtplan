import { BadRequestException } from '@nestjs/common';
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
  leaveRequestMinimumNoticeDays?: number;
  aiEnabled?: boolean;
  clockInDeviationToleranceMinutes?: number;
  clockOutDeviationToleranceMinutes?: number;
  requireNoteForClockInDeviation?: boolean;
  requireNoteForClockOutDeviation?: boolean;
  requireNoteForManualEntry?: boolean;
  automaticTimeRegistrationEnabled?: boolean;
  automaticTimeRegistrationMethod?:
    | 'PLANNED_SHIFT'
    | 'FIXED_MINUTES';
  automaticTimeRegistrationMinutes?: number;
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
    'leaveRequestMinimumNoticeDays',
    'aiEnabled',
    'clockInDeviationToleranceMinutes',
    'clockOutDeviationToleranceMinutes',
    'requireNoteForClockInDeviation',
    'requireNoteForClockOutDeviation',
    'requireNoteForManualEntry',
    'automaticTimeRegistrationEnabled',
    'automaticTimeRegistrationMethod',
    'automaticTimeRegistrationMinutes',
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

      const nextAutomaticEnabled =
        data.automaticTimeRegistrationEnabled ??
        cinema.automaticTimeRegistrationEnabled;

      const nextAutomaticMethod =
        data.automaticTimeRegistrationMethod ??
        cinema.automaticTimeRegistrationMethod;

      const nextAutomaticMinutes =
        data.automaticTimeRegistrationMinutes ??
        cinema.automaticTimeRegistrationMinutes;

      if (
        nextAutomaticEnabled &&
        nextAutomaticMethod ===
          'FIXED_MINUTES' &&
        (
          !Number.isInteger(
            nextAutomaticMinutes,
          ) ||
          nextAutomaticMinutes <= 0
        )
      ) {
        throw new BadRequestException(
          'Angiv et gyldigt antal minutter til automatisk tidsregistrering',
        );
      }

      const enabledChanged =
        data.automaticTimeRegistrationEnabled !==
          undefined &&
        nextAutomaticEnabled !==
          cinema.automaticTimeRegistrationEnabled;

      const configurationChanged =
        nextAutomaticMethod !==
          cinema.automaticTimeRegistrationMethod ||
        nextAutomaticMinutes !==
          cinema.automaticTimeRegistrationMinutes;

      let automaticTimeRegistrationMethodValidFrom:
        Date | null | undefined;

      setDefinedCinemaSettings(
        updateData,
        data,
      );

      if (enabledChanged) {
        const effectiveAt =
          new Date();

        if (nextAutomaticEnabled) {
          updateData.automaticTimeRegistrationActiveFrom =
            effectiveAt;

          await transaction
            .cinemaAutomaticTimeRegistrationVersion
            .updateMany({
              where: {
                cinemaId:
                  cinema.id,
                validTo:
                  null,
              },
              data: {
                validTo:
                  effectiveAt,
              },
            });

          await transaction
            .cinemaAutomaticTimeRegistrationVersion
            .create({
              data: {
                cinemaId:
                  cinema.id,
                method:
                  nextAutomaticMethod,
                minutes:
                  nextAutomaticMinutes,
                validFrom:
                  effectiveAt,
              },
            });

          automaticTimeRegistrationMethodValidFrom =
            effectiveAt;
        } else {
          updateData.automaticTimeRegistrationActiveFrom =
            null;

          await transaction
            .cinemaAutomaticTimeRegistrationVersion
            .updateMany({
              where: {
                cinemaId:
                  cinema.id,
                validTo:
                  null,
              },
              data: {
                validTo:
                  effectiveAt,
              },
            });

          automaticTimeRegistrationMethodValidFrom =
            null;
        }
      } else if (
        nextAutomaticEnabled &&
        configurationChanged
      ) {
        const effectiveAt =
          new Date();

        await transaction
          .cinemaAutomaticTimeRegistrationVersion
          .updateMany({
            where: {
              cinemaId:
                cinema.id,
              validTo:
                null,
            },
            data: {
              validTo:
                effectiveAt,
            },
          });

        await transaction
          .cinemaAutomaticTimeRegistrationVersion
          .create({
            data: {
              cinemaId:
                cinema.id,
              method:
                nextAutomaticMethod,
              minutes:
                nextAutomaticMinutes,
              validFrom:
                effectiveAt,
            },
          });

        automaticTimeRegistrationMethodValidFrom =
          effectiveAt;
      }

      const updatedCinema =
        await transaction.cinema.update({
          where: {
            id:
              cinema.id,
          },
          data:
            updateData,
        });

      if (
        automaticTimeRegistrationMethodValidFrom ===
        undefined
      ) {
        return updatedCinema;
      }

      return {
        ...updatedCinema,
        automaticTimeRegistrationMethodValidFrom,
      };
    },
  );
}
