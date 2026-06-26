import {
  createDetailedTimeEntryRevisionSnapshot,
  createTimeEntryRevisionSnapshot,
} from './time-entry-revision-snapshots';
import { createTimeEntryRevision } from './time-entry-revisions';

export async function recordApproveTimeEntryStatusChange({
  prisma,
  auditLogsService,
  existingEntry,
  entry,
  changedByUserId,
}: {
  prisma: any;
  auditLogsService: any;
  existingEntry: any;
  entry: any;
  changedByUserId: number | null;
}) {
  await createTimeEntryRevision(prisma, {
    timeEntryId: entry.id,
    changedByUserId: changedByUserId ?? null,
    action: 'APPROVED',
    before: createTimeEntryRevisionSnapshot(existingEntry),
    after: createTimeEntryRevisionSnapshot(entry),
    reason: 'Tidsregistrering godkendt',
  });

  await auditLogsService.create({
    action: 'APPROVE_TIME_ENTRY',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: `Status ændret fra ${existingEntry.status} til APPROVED for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
    userId: changedByUserId ?? undefined,
    cinemaId: entry.cinemaId,
  });
}

export async function recordUnapproveTimeEntryStatusChange({
  prisma,
  auditLogsService,
  existingEntry,
  entry,
  changedByUserId,
}: {
  prisma: any;
  auditLogsService: any;
  existingEntry: any;
  entry: any;
  changedByUserId: number | null;
}) {
  await createTimeEntryRevision(prisma, {
    timeEntryId: entry.id,
    changedByUserId: changedByUserId ?? null,
    action: 'UNAPPROVED',
    before: createTimeEntryRevisionSnapshot(existingEntry),
    after: createTimeEntryRevisionSnapshot(entry),
    reason: 'Godkendelse fjernet',
  });

  await auditLogsService.create({
    action: 'UNAPPROVE_TIME_ENTRY',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: `Status ændret fra ${existingEntry.status} til PENDING for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
    userId: changedByUserId ?? undefined,
    cinemaId: entry.cinemaId,
  });
}

export async function recordRejectTimeEntryStatusChange({
  prisma,
  auditLogsService,
  existingEntry,
  entry,
  changedByUserId,
  reason,
}: {
  prisma: any;
  auditLogsService: any;
  existingEntry: any;
  entry: any;
  changedByUserId: number | null;
  reason: string;
}) {
  await createTimeEntryRevision(prisma, {
    timeEntryId: entry.id,
    changedByUserId: changedByUserId ?? null,
    action: 'NEEDS_CHANGES',
    before: createTimeEntryRevisionSnapshot(existingEntry),
    after: createTimeEntryRevisionSnapshot(entry),
    reason,
  });

  await auditLogsService.create({
    action: 'SEND_BACK_TIME_ENTRY',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: `Sendt retur til rettelse for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
    userId: changedByUserId ?? undefined,
    cinemaId: entry.cinemaId,
  });
}

export async function recordVoidTimeEntryStatusChange({
  prisma,
  auditLogsService,
  existingEntry,
  entry,
  changedByUserId,
  reason,
}: {
  prisma: any;
  auditLogsService: any;
  existingEntry: any;
  entry: any;
  changedByUserId: number | null;
  reason: string;
}) {
  await createTimeEntryRevision(prisma, {
    timeEntryId: entry.id,
    changedByUserId: changedByUserId ?? null,
    action: 'VOIDED',
    before: createDetailedTimeEntryRevisionSnapshot(existingEntry),
    after: createDetailedTimeEntryRevisionSnapshot(entry),
    reason,
  });

  await auditLogsService.create({
    action: 'VOID_TIME_ENTRY',
    entityType: 'TimeEntry',
    entityId: entry.id,
    description: `Tidsregistrering annulleret for ${existingEntry.user.firstName} ${existingEntry.user.lastName}`,
    userId: changedByUserId ?? undefined,
    cinemaId: entry.cinemaId,
  });
}
