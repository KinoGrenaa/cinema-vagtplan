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
import { withLockedTimeEntryStatusMutation } from './time-entry-status-mutation-lock';

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
  const changedByUserId =
    getChangedByUserId(user);
  const trimmedAdminNote =
    getRequiredStatusActionNote(
      adminNote,
      'Admin-begrundelse er påkrævet ved send retur til rettelse',
    );
  const initialEntry =
    await findEditableStatusActionEntry({
      prisma,
      id,
      user,
      selectedCinemaId,
    });

  const result =
    await withLockedTimeEntryStatusMutation({
      prisma,
      initialEntry,
      user,
      selectedCinemaId,
      mutate: async (
        tx,
        existingEntry,
      ) => {
        ensureTimeEntryCanBeSentBack(
          existingEntry,
        );

        const entry =
          await tx.timeEntry.update({
            where: {
              id,
            },
            data: {
              status: 'NEEDS_CHANGES',
              adminNote: trimmedAdminNote,
            },
            include:
              getTimeEntryResponseInclude(),
          });

        return {
          existingEntry,
          entry,
        };
      },
    });

  await recordRejectTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry: result.existingEntry,
    entry: result.entry,
    changedByUserId,
    reason: trimmedAdminNote,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    result.entry,
  );
}
