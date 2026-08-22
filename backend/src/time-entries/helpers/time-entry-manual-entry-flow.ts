import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { ensureTimeEntryCreationPeriodWritable } from './time-entry-creation-payroll-access';
import { analyzeTimeEntryDeviation } from './time-entry-deviation';
import { ensureManualEntryDeviationNotes } from './time-entry-deviation-notes';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { recordManualTimeEntrySubmitted } from './time-entry-mutation-records';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  ensureClockOutAfterClockIn,
  parseRequiredTimeEntryDate,
} from './time-entry-date-helpers';
import { getManualEntryStorageNotes } from './time-entry-note-helpers';
import {
  ensureNoOverlappingManualShift,
  ensureNoOverlappingManualTimeEntry,
} from './time-entry-overlap-helpers';
import {
  ensureNoExistingEntryForShift,
  ensureShiftBelongsToUser,
  findManualEntryShift,
} from './time-entry-shift-resolution';

type SubmitManualEntryData = {
  userId: number;
  cinemaId: number;
  shiftId?: number | null;
  clockIn: string;
  clockOut: string;
  note?: string;
  clockInNote?: string;
  clockOutNote?: string;
};

export async function submitManualTimeEntry(params: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  data: SubmitManualEntryData;
}) {
  const {
    prisma,
    realtimeGateway,
    auditLogsService,
    data,
  } = params;
  const clockIn = parseRequiredTimeEntryDate(
    data.clockIn,
    'Ugyldig mødetid eller fyraften',
  );
  const clockOut = parseRequiredTimeEntryDate(
    data.clockOut,
    'Ugyldig mødetid eller fyraften',
  );

  ensureClockOutAfterClockIn(clockIn, clockOut);

  const result = await prisma.$transaction(
    async (tx) => {
      const txPrisma =
        tx as unknown as PrismaService;
      const shift = await findManualEntryShift(
        txPrisma,
        {
          shiftId: data.shiftId,
          cinemaId: data.cinemaId,
        },
      );

      ensureShiftBelongsToUser(
        shift,
        data.userId,
        'Du kan kun indsende timer for dine egne vagter',
      );

      await ensureTimeEntryCreationPeriodWritable(
        tx,
        {
          cinemaId: data.cinemaId,
          referenceDate:
            shift?.startTime ?? clockIn,
        },
      );

      await ensureNoOverlappingManualTimeEntry(
        txPrisma,
        {
          userId: data.userId,
          cinemaId: data.cinemaId,
          clockIn,
          clockOut,
        },
      );
      await ensureNoOverlappingManualShift(
        txPrisma,
        {
          userId: data.userId,
          cinemaId: data.cinemaId,
          clockIn,
          clockOut,
        },
      );

      const {
        note,
        clockInNote,
        clockOutNote,
      } = getManualEntryStorageNotes(
        data,
        Boolean(shift),
      );

      if (shift) {
        const deviation = analyzeTimeEntryDeviation(
          {
            clockIn,
            clockOut,
            shift,
          },
          shift.cinema,
        );

        ensureManualEntryDeviationNotes({
          deviation,
          clockInNote,
          clockOutNote,
        });

        await ensureNoExistingEntryForShift(
          txPrisma,
          {
            shiftId: shift.id,
            userId: data.userId,
            cinemaId: data.cinemaId,
            message:
              'Der er allerede indsendt timer for denne vagt',
          },
        );
      } else {
        const cinema =
          await tx.cinema.findUniqueOrThrow({
            where: {
              id: data.cinemaId,
            },
            select: {
              requireNoteForManualEntry: true,
            },
          });

        const deviation =
          analyzeTimeEntryDeviation(
            {
              clockIn,
              clockOut,
              shift: null,
              cinema,
            },
            cinema,
          );

        ensureManualEntryDeviationNotes({
          deviation,
          note,
          clockInNote,
          clockOutNote,
        });
      }

      const entry = await tx.timeEntry.create({
        data: {
          userId: data.userId,
          cinemaId: data.cinemaId,
          shiftId: shift?.id || null,
          payrollTypeId:
            shift?.jobFunction?.defaultPayrollExportCodeId || null,
          clockIn,
          clockOut,
          note,
          clockInNote,
          clockOutNote,
          status: 'PENDING',
        },
        include: getTimeEntryResponseInclude(),
      });

      return {
        entry,
        shift,
      };
    },
  );

  await recordManualTimeEntrySubmitted({
    prisma,
    auditLogsService,
    entry: result.entry,
    shift: result.shift,
    changedByUserId: data.userId,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    result.entry,
  );
}
