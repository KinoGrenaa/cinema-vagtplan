import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { withTimeEntryDeviation } from './time-entry-deviation';
import { ensureTimeEntryEditable } from './time-entry-access';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import {
  recordClockInTimeEntryCreated,
  recordClockOutTimeEntryAudit,
} from './time-entry-mutation-records';
import { findTimeEntryWithCinemaShiftOrThrow } from './time-entry-query-helpers';
import { findOpenTimeEntry } from './time-entry-read-helpers';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  ensureClockOutAfterClockIn,
  parseOptionalTimeEntryDate,
} from './time-entry-date-helpers';
import {
  buildCombinedClockOutNote,
  getTrimmedOptionalNote,
} from './time-entry-note-helpers';
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
  const { prisma, realtimeGateway, auditLogsService, data } = params;

  const openEntry = await findOpenTimeEntry(prisma, {
    userId: data.userId,
    cinemaId: data.cinemaId,
  });

  if (openEntry) {
    return withTimeEntryDeviation(openEntry);
  }

  const clockIn = parseOptionalTimeEntryDate(data.clockIn, 'Ugyldig mødetid');

  const shift = await resolveClockInShift(prisma, {
    shiftId: data.shiftId,
    userId: data.userId,
    cinemaId: data.cinemaId,
    clockIn,
  });

  await ensureNoExistingEntryForShift(prisma, {
    shiftId: shift?.id,
    userId: data.userId,
    cinemaId: data.cinemaId,
    message: 'Der findes allerede en tidsregistrering for denne vagt',
  });

  const note = getTrimmedOptionalNote(data.note);

  const entry = await prisma.timeEntry.create({
    data: {
      userId: data.userId,
      cinemaId: data.cinemaId,
      shiftId: shift?.id || null,
      payrollTypeId: shift?.workType?.payrollTypeId || null,
      clockIn,
      note,
      clockInNote: note,
      status: 'PENDING',
    },
    include: getTimeEntryResponseInclude(),
  });

  await recordClockInTimeEntryCreated({
    prisma,
    auditLogsService,
    entry,
    shift,
    changedByUserId: data.userId,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}

export async function clockOutTimeEntry(params: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  id: number;
  data?: ClockOutData;
}) {
  const { prisma, realtimeGateway, auditLogsService, id, data } = params;

  const existingEntry = await findTimeEntryWithCinemaShiftOrThrow(prisma, id);

  ensureTimeEntryEditable(existingEntry);

  const clockOut = parseOptionalTimeEntryDate(
    data?.clockOut,
    'Ugyldig fyraften',
  );

  ensureClockOutAfterClockIn(existingEntry.clockIn, clockOut);

  const clockOutNote = getTrimmedOptionalNote(data?.note);
  const combinedNote = buildCombinedClockOutNote(
    existingEntry.note,
    clockOutNote,
  );

  const entry = await prisma.timeEntry.update({
    where: { id },
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

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}
