import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  ensureTimeEntryCanBeUnapproved,
  findEditableStatusActionEntry,
  getChangedByUserId,
  recordUnapproveTimeEntryStatusChange,
} from './time-entry-status-action-helpers';

export async function unapproveTimeEntryFlow({
  prisma,
  realtimeGateway,
  auditLogsService,
  id,
  user,
  selectedCinemaId,
}: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  id: number;
  user: any;
  selectedCinemaId?: number | null;
}) {
  const changedByUserId = getChangedByUserId(user);
  const existingEntry = await findEditableStatusActionEntry({
    prisma,
    id,
    user,
    selectedCinemaId,
  });

  ensureTimeEntryCanBeUnapproved(existingEntry);

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      status: 'PENDING',
    },
    include: getTimeEntryResponseInclude(),
  });

  await recordUnapproveTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    changedByUserId,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}
