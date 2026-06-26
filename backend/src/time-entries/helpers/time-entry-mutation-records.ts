import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createDetailedTimeEntryRevisionSnapshot } from './time-entry-revision-snapshots';
import { createTimeEntryRevision } from './time-entry-revisions';

async function recordCreatedTimeEntryRevision({
  prisma,
  entry,
  changedByUserId,
}: {
  prisma: PrismaService;
  entry: any;
  changedByUserId: number;
}) {
  await createTimeEntryRevision(prisma, {
    timeEntryId: entry.id,
    changedByUserId,
    action: 'CREATED',
    before: null,
    after: createDetailedTimeEntryRevisionSnapshot(entry),
    reason: null,
  });
}

export async function recordManualTimeEntrySubmitted({
  prisma,
  auditLogsService,
  entry,
  shift,
  changedByUserId,
}: {
  prisma: PrismaService;
  auditLogsService: AuditLogsService;
  entry: any;
  shift: any;
  changedByUserId: number;
}) {
  await recordCreatedTimeEntryRevision({ prisma, entry, changedByUserId });

  await auditLogsService.create({
    action: 'SUBMIT_MANUAL_TIME_ENTRY',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: shift
      ? 'Medarbejder indsendte manuel tidsregistrering på planlagt vagt'
      : 'Medarbejder indsendte manuel tidsregistrering uden tilknyttet vagt',
    userId: entry.userId,
    cinemaId: entry.cinemaId,
  });
}

export async function recordClockInTimeEntryCreated({
  prisma,
  auditLogsService,
  entry,
  shift,
  changedByUserId,
}: {
  prisma: PrismaService;
  auditLogsService: AuditLogsService;
  entry: any;
  shift: any;
  changedByUserId: number;
}) {
  await recordCreatedTimeEntryRevision({ prisma, entry, changedByUserId });

  await auditLogsService.create({
    action: 'CLOCK_IN',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: shift
      ? 'Medarbejder registrerede mødetid på planlagt vagt'
      : 'Medarbejder registrerede mødetid uden tilknyttet vagt',
    userId: entry.userId,
    cinemaId: entry.cinemaId,
  });
}

export async function recordClockOutTimeEntryAudit({
  auditLogsService,
  entry,
}: {
  auditLogsService: AuditLogsService;
  entry: any;
}) {
  await auditLogsService.create({
    action: 'CLOCK_OUT',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: 'Medarbejder registrerede fyraften',
    userId: entry.userId,
    cinemaId: entry.cinemaId,
  });
}

export async function recordOwnTimeEntryUpdated({
  prisma,
  auditLogsService,
  existingEntry,
  entry,
  user,
  changes,
}: {
  prisma: PrismaService;
  auditLogsService: AuditLogsService;
  existingEntry: any;
  entry: any;
  user: any;
  changes: string[];
}) {
  await createTimeEntryRevision(prisma, {
    timeEntryId: entry.id,
    changedByUserId: user.sub,
    action: 'UPDATED',
    before: createDetailedTimeEntryRevisionSnapshot(existingEntry),
    after: createDetailedTimeEntryRevisionSnapshot(entry),
    reason: changes.join('\n'),
  });

  await auditLogsService.create({
    action: 'UPDATE_OWN_TIME_ENTRY',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: [
      `Medarbejder rettede egen tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}.`,
      ...changes,
    ].join('\n'),
    userId: user.sub,
    cinemaId: entry.cinemaId,
  });
}

export async function recordAdminTimeEntryUpdated({
  prisma,
  auditLogsService,
  existingEntry,
  entry,
  user,
  changes,
  adminNote,
}: {
  prisma: PrismaService;
  auditLogsService: AuditLogsService;
  existingEntry: any;
  entry: any;
  user: any;
  changes: string[];
  adminNote?: string | null;
}) {
  await createTimeEntryRevision(prisma, {
    timeEntryId: entry.id,
    changedByUserId: user?.sub ?? null,
    action: 'UPDATED',
    before: createDetailedTimeEntryRevisionSnapshot(existingEntry),
    after: createDetailedTimeEntryRevisionSnapshot(entry),
    reason: adminNote,
  });

  for (const change of changes) {
    await auditLogsService.create({
      action: 'UPDATE_TIME_ENTRY_FIELD',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: change,
      userId: user?.sub ?? null,
      cinemaId: entry.cinemaId,
    });
  }

  await auditLogsService.create({
    action: 'UPDATE_TIME_ENTRY',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: [
      `Rettede tidsregistrering for ${existingEntry.user.firstName} ${existingEntry.user.lastName}.`,
      ...changes,
      `Begrundelse: ${adminNote}`,
    ].join('\n'),
    userId: user?.sub ?? null,
    cinemaId: entry.cinemaId,
  });
}
