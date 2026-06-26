import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { analyzeTimeEntryDeviation } from './time-entry-deviation';
import { ensureManualEntryDeviationNotes } from './time-entry-deviation-notes';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { recordManualTimeEntrySubmitted } from './time-entry-mutation-records';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  ensureClockOutAfterClockIn,
  parseRequiredTimeEntryDate,
} from './time-entry-date-helpers';
import { getManualEntryNotes } from './time-entry-note-helpers';
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
  const { prisma, realtimeGateway, auditLogsService, data } = params;

  const clockIn = parseRequiredTimeEntryDate(
    data.clockIn,
    'Ugyldig mødetid eller fyraften',
  );
  const clockOut = parseRequiredTimeEntryDate(
    data.clockOut,
    'Ugyldig mødetid eller fyraften',
  );

  ensureClockOutAfterClockIn(clockIn, clockOut);

  await ensureNoOverlappingManualTimeEntry(prisma, {
    userId: data.userId,
    cinemaId: data.cinemaId,
    clockIn,
    clockOut,
  });

  await ensureNoOverlappingManualShift(prisma, {
    userId: data.userId,
    cinemaId: data.cinemaId,
    clockIn,
    clockOut,
  });

  const shift = await findManualEntryShift(prisma, {
    shiftId: data.shiftId,
    cinemaId: data.cinemaId,
  });

  ensureShiftBelongsToUser(
    shift,
    data.userId,
    'Du kan kun indsende timer for dine egne vagter',
  );

  const { clockInNote, clockOutNote } = getManualEntryNotes(data);

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

    await ensureNoExistingEntryForShift(prisma, {
      shiftId: shift.id,
      userId: data.userId,
      cinemaId: data.cinemaId,
      message: 'Der er allerede indsendt timer for denne vagt',
    });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: data.userId,
      cinemaId: data.cinemaId,
      shiftId: shift?.id || null,
      payrollTypeId: shift?.workType?.payrollTypeId || null,
      clockIn,
      clockOut,
      note: data.note ?? null,
      clockInNote,
      clockOutNote,
      status: 'PENDING',
    },
    include: getTimeEntryResponseInclude(),
  });

  await recordManualTimeEntrySubmitted({
    prisma,
    auditLogsService,
    entry,
    shift,
    changedByUserId: data.userId,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}
