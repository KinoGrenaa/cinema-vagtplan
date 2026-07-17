import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { ensureTimeEntryCanBeSentBack } from './time-entry-reject-status';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  findEditableStatusActionEntry,
  getChangedByUserId,
  getRequiredStatusActionNote,
  recordRejectTimeEntryStatusChange,
} from './time-entry-status-action-helpers';

export async function rejectTimeEntryFlow({
  prisma,
  realtimeGateway,
  auditLogsService,
  id,
  adminNote,
  user,
  selectedCinemaId,
}: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  id: number;
  adminNote: string | undefined;
  user: any;
  selectedCinemaId?: number | null;
}) {
  const changedByUserId = getChangedByUserId(user);
  const trimmedAdminNote = getRequiredStatusActionNote(
    adminNote,
    'Admin-begrundelse er påkrævet ved send retur til rettelse',
  );
  const existingEntry = await findEditableStatusActionEntry({
    prisma,
    id,
    user,
    selectedCinemaId,
  });

  ensureTimeEntryCanBeSentBack(existingEntry);

  const entry = await prisma.timeEntry.update({
    where: {
      id,
    },
    data: {
      status: 'NEEDS_CHANGES',
      adminNote: trimmedAdminNote,
    },
    include: getTimeEntryResponseInclude(),
  });

  await recordRejectTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    changedByUserId,
    reason: trimmedAdminNote,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}
