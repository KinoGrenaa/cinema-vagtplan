import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { ensureTimeEntryEditable } from './time-entry-access';
import { ensureTimeEntryCreationPeriodWritable } from './time-entry-creation-payroll-access';
import {
  ensureClockOutAfterClockIn,
  parseOptionalTimeEntryDate,
} from './time-entry-date-helpers';
import {
  withTimeEntryDeviation,
} from './time-entry-deviation';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import {
  recordClockInTimeEntryCreated,
  recordClockOutTimeEntryAudit,
} from './time-entry-mutation-records';
import {
  buildCombinedClockOutNote,
  getTrimmedOptionalNote,
} from './time-entry-note-helpers';
import { findTimeEntryWithCinemaShiftOrThrow } from './time-entry-query-helpers';
import { findOpenTimeEntry } from './time-entry-read-helpers';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  ensureNoExistingEntryForShift,
  resolveClockInShift,
} from './time-entry-shift-resolution';

type ClockInData = {
  userId: number;
  cinemaId: number;
  shiftId?: number | null;
  clockIn?: string;
  note?: string;
};

type ClockOutData = {
  clockOut?: string;
  note?: string;
};

export async function clockInTimeEntry(params: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  data: ClockInData;
}) {
  const {
    prisma,
    realtimeGateway,
    auditLogsService,
    data,
  } = params;
  const clockIn = parseOptionalTimeEntryDate(
    data.clockIn,
    'Ugyldig mødetid',
  );

  const result = await prisma.$transaction(
    async (tx) => {
      const txPrisma =
        tx as unknown as PrismaService;
      const openEntry = await findOpenTimeEntry(
        txPrisma,
        {
          userId: data.userId,
        },
      );

      if (openEntry) {
        return {
          kind: 'OPEN' as const,
          openEntry,
        };
      }

      const shift = await resolveClockInShift(
        txPrisma,
        {
          shiftId: data.shiftId,
          userId: data.userId,
          cinemaId: data.cinemaId,
          clockIn,
        },
      );

      await ensureTimeEntryCreationPeriodWritable(
        tx,
        {
          cinemaId: data.cinemaId,
          referenceDate:
            shift?.startTime ?? clockIn,
        },
      );

      await ensureNoExistingEntryForShift(
        txPrisma,
        {
          shiftId: shift?.id,
          userId: data.userId,
          cinemaId: data.cinemaId,
          message:
            'Der findes allerede en tidsregistrering for denne vagt',
        },
      );

      const note = getTrimmedOptionalNote(
        data.note,
      );
      const entry = await tx.timeEntry.create({
        data: {
          userId: data.userId,
          cinemaId: data.cinemaId,
          shiftId: shift?.id || null,
          payrollTypeId:
            shift?.jobFunction?.defaultPayrollExportCodeId ||
            null,
          clockIn,
          note,
          clockInNote: note,
          status: 'PENDING',
        },
        include: getTimeEntryResponseInclude(),
      });

      return {
        kind: 'CREATED' as const,
        entry,
        shift,
      };
    },
  );

  if (result.kind === 'OPEN') {
    return withTimeEntryDeviation(
      result.openEntry,
    );
  }

  await recordClockInTimeEntryCreated({
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

export async function clockOutTimeEntry(params: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  id: number;
  data?: ClockOutData;
}) {
  const {
    prisma,
    realtimeGateway,
    auditLogsService,
    id,
    data,
  } = params;
  const existingEntry =
    await findTimeEntryWithCinemaShiftOrThrow(
      prisma,
      id,
    );

  ensureTimeEntryEditable(existingEntry);

  const clockOut = parseOptionalTimeEntryDate(
    data?.clockOut,
    'Ugyldig fyraften',
  );

  ensureClockOutAfterClockIn(
    existingEntry.clockIn,
    clockOut,
  );

  const clockOutNote = getTrimmedOptionalNote(
    data?.note,
  );
  const combinedNote = buildCombinedClockOutNote(
    existingEntry.note,
    clockOutNote,
  );

  const entry = await prisma.timeEntry.update({
    where: {
      id,
    },
    data: {
      clockOut,
      note: combinedNote || null,
      clockOutNote: clockOutNote || null,
    },
    include: getTimeEntryResponseInclude(),
  });

  await recordClockOutTimeEntryAudit({
    auditLogsService,
    entry,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    entry,
  );
}
