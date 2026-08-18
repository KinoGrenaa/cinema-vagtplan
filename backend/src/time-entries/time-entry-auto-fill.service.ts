import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  getCopenhagenDateKey,
  getCopenhagenDayInstantRange,
} from '../shift-planning-drafts/shift-planning-time-zone';
import { ensureTimeEntryCreationPeriodWritable } from './helpers/time-entry-creation-payroll-access';
import {
  createDetailedTimeEntryRevisionSnapshot,
} from './helpers/time-entry-revision-snapshots';
import {
  createTimeEntryRevision,
} from './helpers/time-entry-revisions';
import {
  getTimeEntryResponseInclude,
} from './helpers/time-entry-includes';
import {
  notifyTimeEntryUpdated,
} from './helpers/time-entry-response';
import {
  resolveAutomaticClockOut,
  type AutomaticTimeRegistrationMethod,
} from './helpers/time-entry-auto-fill-rules';

type AutoFillOptions = {
  referenceDate?: Date;
  cinemaId?: number;
};

type AutomaticConfigurationVersion = {
  method: string;
  minutes: number;
  validFrom: Date;
  validTo: Date | null;
};

function getAutomaticConfigurationForShift(
  versions:
    AutomaticConfigurationVersion[],
  shiftEnd: Date,
) {
  const shiftEndTime =
    shiftEnd.getTime();

  return versions.find(
    (version) =>
      version.validFrom.getTime() <=
        shiftEndTime &&
      (
        version.validTo ===
          null ||
        shiftEndTime <
          version.validTo.getTime()
      ),
  ) ?? null;
}

@Injectable()
export class TimeEntryAutoFillService {
  private readonly logger =
    new Logger(
      TimeEntryAutoFillService.name,
    );

  constructor(
    private prisma:
      PrismaService,
    private realtimeGateway:
      RealtimeGateway,
    private auditLogsService:
      AuditLogsService,
  ) {}

  @Cron(
    CronExpression.EVERY_HOUR,
  )
  async processMissingTimeEntries(
    options: AutoFillOptions = {},
  ) {
    const now =
      options.referenceDate ??
      new Date();

    const todayStart =
      getCopenhagenDayInstantRange(
        getCopenhagenDateKey(
          now,
        ),
      ).start;

    const cinemas =
      await this.prisma.cinema.findMany({
        where: {
          automaticTimeRegistrationEnabled:
            true,
          automaticTimeRegistrationActiveFrom:
            {
              not: null,
            },
          ...(options.cinemaId
            ? {
                id:
                  options.cinemaId,
              }
            : {}),
        },
        select: {
          id: true,
          automaticTimeRegistrationActiveFrom:
            true,
          automaticTimeRegistrationVersions:
            {
              select: {
                method:
                  true,
                minutes:
                  true,
                validFrom:
                  true,
                validTo:
                  true,
              },
              orderBy: {
                validFrom:
                  'desc',
              },
            },
        },
      });

    let changedCount = 0;

    for (
      const cinema of cinemas
    ) {
      const activeFrom =
        cinema.automaticTimeRegistrationActiveFrom;

      if (!activeFrom) {
        continue;
      }

      const shifts =
        await this.prisma.shift.findMany({
          where: {
            cinemaId:
              cinema.id,
            userId: {
              not: null,
            },
            endTime: {
              lt:
                todayStart,
              gt:
                activeFrom,
            },
          },
          include: {
            jobFunction: {
              include: {
                defaultPayrollExportCode:
                  true,
              },
            },
            timeEntries: {
              orderBy: {
                createdAt:
                  'desc',
              },
              take: 1,
            },
          },
          orderBy: {
            endTime:
              'asc',
          },
        });

      for (
        const shift of shifts
      ) {
        const version =
          getAutomaticConfigurationForShift(
            cinema
              .automaticTimeRegistrationVersions,
            shift.endTime,
          );

        if (!version) {
          this.logger.error(
            `No automatic time registration configuration version for shift ${shift.id}`,
          );

          continue;
        }

        try {
          const changed =
            await this.processShift(
              {
                id:
                  cinema.id,
                automaticTimeRegistrationMethod:
                  version.method,
                automaticTimeRegistrationMinutes:
                  version.minutes,
              },
              shift,
            );

          if (changed) {
            changedCount += 1;
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : String(error);

          this.logger.error(
            `Automatic time registration failed for shift ${shift.id}: ${message}`,
          );
        }
      }
    }

    if (changedCount > 0) {
      this.logger.log(
        `${changedCount} automatic time registration(s) updated.`,
      );
    }

    return changedCount;
  }

  private async processShift(
    cinema: {
      id: number;
      automaticTimeRegistrationMethod:
        string;
      automaticTimeRegistrationMinutes:
        number;
    },
    shift: any,
  ) {
    const existing =
      shift.timeEntries?.[0] ??
      null;

    if (
      existing?.clockOut ||
      existing?.status ===
        'VOIDED' ||
      existing?.status ===
        'APPROVED'
    ) {
      return false;
    }

    const method =
      cinema.automaticTimeRegistrationMethod as
        AutomaticTimeRegistrationMethod;

    if (
      method !==
        'PLANNED_SHIFT' &&
      method !==
        'FIXED_MINUTES'
    ) {
      throw new Error(
        'Unknown automatic time registration method',
      );
    }

    if (existing) {
      if (
        existing.status !==
        'PENDING'
      ) {
        return false;
      }

      const automaticClockOut =
        resolveAutomaticClockOut({
          method,
          fixedMinutes:
            cinema.automaticTimeRegistrationMinutes,
          clockIn:
            existing.clockIn,
          plannedClockOut:
            shift.endTime,
        });

      const result =
        await this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`
              SELECT "id"
              FROM "Shift"
              WHERE "id" = ${shift.id}
              FOR UPDATE
            `;

            const current =
              await tx.timeEntry.findUnique({
                where: {
                  id:
                    existing.id,
                },
                include:
                  getTimeEntryResponseInclude(),
              });

            if (
              !current ||
              current.clockOut ||
              current.status !==
                'PENDING'
            ) {
              return null;
            }

            const entry =
              await tx.timeEntry.update({
                where: {
                  id:
                    current.id,
                },
                data: {
                  clockOut:
                    automaticClockOut,
                  automaticClockOut:
                    true,
                },
                include:
                  getTimeEntryResponseInclude(),
              });

            await createTimeEntryRevision(
              tx as unknown as PrismaService,
              {
                timeEntryId:
                  entry.id,
                changedByUserId:
                  null,
                action:
                  'AUTO_CLOCK_OUT',
                before:
                  createDetailedTimeEntryRevisionSnapshot(
                    current,
                  ),
                after:
                  createDetailedTimeEntryRevisionSnapshot(
                    entry,
                  ),
                reason:
                  'Systemet udfyldte manglende fyraften automatisk',
              },
            );

            return entry;
          },
        );

      if (!result) {
        return false;
      }

      await this.auditLogsService.create({
        action:
          'AUTO_CLOCK_OUT',
        entityType:
          'TimeEntry',
        entityId:
          result.id,
        description:
          'Systemet udfyldte manglende fyraften automatisk',
        cinemaId:
          result.cinemaId,
      });

      notifyTimeEntryUpdated(
        this.realtimeGateway,
        result,
      );

      return true;
    }

    const userId =
      shift.userId;

    if (!userId) {
      return false;
    }

    const automaticClockIn =
      new Date(
        shift.startTime,
      );

    const automaticClockOut =
      resolveAutomaticClockOut({
        method,
        fixedMinutes:
          cinema.automaticTimeRegistrationMinutes,
        clockIn:
          automaticClockIn,
        plannedClockOut:
          shift.endTime,
      });

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
            SELECT "id"
            FROM "Shift"
            WHERE "id" = ${shift.id}
            FOR UPDATE
          `;

          const alreadyExists =
            await tx.timeEntry.findFirst({
              where: {
                shiftId:
                  shift.id,
                userId,
                cinemaId:
                  cinema.id,
              },
              select: {
                id:
                  true,
              },
            });

          if (alreadyExists) {
            return null;
          }

          await ensureTimeEntryCreationPeriodWritable(
            tx,
            {
              cinemaId:
                cinema.id,
              referenceDate:
                shift.startTime,
            },
          );

          const entry =
            await tx.timeEntry.create({
              data: {
                userId,
                cinemaId:
                  cinema.id,
                shiftId:
                  shift.id,
                payrollTypeId:
                  shift.jobFunction
                    ?.defaultPayrollExportCodeId ??
                  null,
                clockIn:
                  automaticClockIn,
                clockOut:
                  automaticClockOut,
                status:
                  'PENDING',
                automaticClockIn:
                  true,
                automaticClockOut:
                  true,
              },
              include:
                getTimeEntryResponseInclude(),
            });

          await createTimeEntryRevision(
            tx as unknown as PrismaService,
            {
              timeEntryId:
                entry.id,
              changedByUserId:
                null,
              action:
                'AUTO_CREATED',
              before:
                null,
              after:
                createDetailedTimeEntryRevisionSnapshot(
                  entry,
                ),
              reason:
                'Systemet oprettede manglende tidsregistrering automatisk',
            },
          );

          return entry;
        },
      );

    if (!result) {
      return false;
    }

    await this.auditLogsService.create({
      action:
        'AUTO_CREATED',
      entityType:
        'TimeEntry',
      entityId:
        result.id,
      description:
        'Systemet oprettede manglende tidsregistrering automatisk',
      cinemaId:
        result.cinemaId,
    });

    notifyTimeEntryUpdated(
      this.realtimeGateway,
      result,
    );

    return true;
  }
}
