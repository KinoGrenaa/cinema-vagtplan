import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  getUnapprovePayrollContext,
} from './time-entry-unapprove-payroll';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  unapproveTimeEntryWithPayrollTransaction,
} from './time-entry-status-payroll-transaction';
import {
  ensureTimeEntryCanBeUnapproved,
  findEditableStatusActionEntry,
  getChangedByUserId,
  recordUnapproveTimeEntryStatusChange,
} from './time-entry-status-action-helpers';
import { withLockedTimeEntryStatusMutation } from './time-entry-status-mutation-lock';

export async function unapproveTimeEntryFlow({
  prisma,
  payrollService,
  realtimeGateway,
  auditLogsService,
  id,
  user,
  selectedCinemaId,
  confirmPayrollAdjustment,
}: {
  prisma: PrismaService;
  payrollService: PayrollService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  id: number;
  user: any;
  selectedCinemaId?: number | null;
  confirmPayrollAdjustment: boolean;
}) {
  const changedByUserId =
    getChangedByUserId(user);
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
        ensureTimeEntryCanBeUnapproved(
          existingEntry,
        );

        const payrollContext =
          await getUnapprovePayrollContext({
            prisma:
              tx as unknown as PrismaService,
            payrollService,
            existingEntry,
            confirmPayrollAdjustment,
          });

        const entry =
          await unapproveTimeEntryWithPayrollTransaction({
            prisma,
            transactionClient: tx,
            id,
            existingEntry,
            payrollContext,
            changedByUserId:
              changedByUserId ?? null,
          });

        return {
          existingEntry,
          entry,
        };
      },
    });

  await recordUnapproveTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry: result.existingEntry,
    entry: result.entry,
    changedByUserId,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    result.entry,
  );
}
