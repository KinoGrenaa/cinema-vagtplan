import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  ensureTimeEntryEditable,
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
  const existingEntry =
    await findTimeEntryWithUserCinemaShiftOrThrow(
      prisma,
      id,
    );

  ensureUserCanAccessTimeEntry(
    user,
    existingEntry,
    selectedCinemaId,
  );

  const approvalPayrollContext =
    await getApprovalPayrollContext({
      payrollService,
      existingEntry,
      confirmPayrollAdjustment,
    });

  ensureTimeEntryEditable(existingEntry, user);
  ensureTimeEntryCanBeApproved(existingEntry);

  const entry =
    await approveTimeEntryWithPayrollTransaction({
      prisma,
      id,
      approvalPayrollContext,
      confirmPayrollAdjustment,
      changedByUserId:
        changedByUserId ?? null,
    });

  await recordApproveTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    changedByUserId,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    entry,
  );
}
