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
  const existingEntry =
    await findEditableStatusActionEntry({
      prisma,
      id,
      user,
      selectedCinemaId,
    });

  ensureTimeEntryCanBeUnapproved(existingEntry);

  const payrollContext =
    await getUnapprovePayrollContext({
      prisma,
      payrollService,
      existingEntry,
      confirmPayrollAdjustment,
    });

  const entry =
    await unapproveTimeEntryWithPayrollTransaction({
      prisma,
      id,
      existingEntry,
      payrollContext,
      changedByUserId:
        changedByUserId ?? null,
    });

  await recordUnapproveTimeEntryStatusChange({
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
