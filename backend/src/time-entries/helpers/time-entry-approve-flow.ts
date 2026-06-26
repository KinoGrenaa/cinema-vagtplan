import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { ensureTimeEntryEditable, ensureUserCanAccessTimeEntry } from './time-entry-access';
import {
  ensureTimeEntryCanBeApproved,
  getApprovalPayrollContext,
  getApprovalPayrollUpdateData,
} from './time-entry-approval-helpers';
import { formatSignedDuration, getEntryMinutes } from './time-entry-deviation';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { createOrUpdateTimeEntryPayrollAdjustment } from './time-entry-payroll-adjustments';
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
  const changedByUserId = getChangedByUserId(user);
  const existingEntry = await findTimeEntryWithUserCinemaShiftOrThrow(
    prisma,
    id,
  );

  ensureUserCanAccessTimeEntry(user, existingEntry, selectedCinemaId);

  const approvalPayrollContext = await getApprovalPayrollContext({
    payrollService,
    existingEntry,
    confirmPayrollAdjustment,
  });

  ensureTimeEntryEditable(existingEntry, user);
  ensureTimeEntryCanBeApproved(existingEntry);

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: getApprovalPayrollUpdateData({
      ...approvalPayrollContext,
      confirmPayrollAdjustment,
    }),
    include: getTimeEntryResponseInclude(),
  });

  if (
    approvalPayrollContext.payrollPeriod?.status === 'EXPORTED' &&
    confirmPayrollAdjustment
  ) {
    const adjustedMinutes = getEntryMinutes(entry);

    await createOrUpdateTimeEntryPayrollAdjustment(prisma, {
      timeEntry: entry,
      originalPayrollPeriodId: approvalPayrollContext.payrollPeriod.id,
      settlementPayrollPeriodId:
        approvalPayrollContext.adjustmentPayrollPeriod?.id ?? null,
      type: 'APPROVAL_AFTER_EXPORT',
      exportedMinutes: 0,
      adjustedMinutes,
      reason: `Tidsregistrering godkendt efter eksport. Efterregulering: ${formatSignedDuration(
        adjustedMinutes,
      )}`,
      changedByUserId: changedByUserId ?? null,
    });
  }

  await recordApproveTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    changedByUserId,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}
