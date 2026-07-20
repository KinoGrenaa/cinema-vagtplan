import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  ensureUserCanAccessTimeEntry,
} from './time-entry-access';
import { approveTimeEntryWithPayrollTransaction } from './time-entry-approve-payroll-transaction';
import {
  ensureTimeEntryCanBeApproved,
  getApprovalPayrollContext,
} from './time-entry-approval-helpers';
import { findTimeEntryWithUserCinemaShiftOrThrow } from './time-entry-query-helpers';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  getChangedByUserId,
  recordApproveTimeEntryStatusChange,
} from './time-entry-status-action-helpers';
import { withLockedTimeEntryStatusMutation } from './time-entry-status-mutation-lock';

export async function approveTimeEntryFlow({
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
    await findTimeEntryWithUserCinemaShiftOrThrow(
      prisma,
      id,
    );

  ensureUserCanAccessTimeEntry(
    user,
    initialEntry,
    selectedCinemaId,
  );

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
        ensureTimeEntryCanBeApproved(
          existingEntry,
        );

        const approvalPayrollContext =
          await getApprovalPayrollContext({
            payrollService,
            existingEntry,
            confirmPayrollAdjustment,
          });

        const entry =
          await approveTimeEntryWithPayrollTransaction({
            prisma,
            transactionClient: tx,
            id,
            approvalPayrollContext,
            confirmPayrollAdjustment,
            changedByUserId:
              changedByUserId ?? null,
          });

        return {
          existingEntry,
          entry,
        };
      },
    });

  await recordApproveTimeEntryStatusChange({
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
