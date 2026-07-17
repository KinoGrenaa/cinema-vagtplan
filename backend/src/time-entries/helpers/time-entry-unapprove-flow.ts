import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import {
  createUnapprovePayrollAdjustmentIfNeeded,
  getUnapprovePayrollContext,
  getUnapproveTimeEntryUpdateData,
} from './time-entry-unapprove-payroll';
import { notifyTimeEntryUpdated } from './time-entry-response';
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
  const changedByUserId = getChangedByUserId(user);
  const existingEntry = await findEditableStatusActionEntry({
    prisma,
    id,
    user,
    selectedCinemaId,
  });

  ensureTimeEntryCanBeUnapproved(existingEntry);

  const payrollContext = await getUnapprovePayrollContext({
    prisma,
    payrollService,
    existingEntry,
    confirmPayrollAdjustment,
  });

  const entry = await prisma.timeEntry.update({
    where: {
      id,
    },
    data: getUnapproveTimeEntryUpdateData(payrollContext),
    include: getTimeEntryResponseInclude(),
  });

  await createUnapprovePayrollAdjustmentIfNeeded({
    prisma,
    existingEntry,
    entry,
    payrollContext,
    changedByUserId,
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
