import { BadRequestException } from '@nestjs/common';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  findEditableStatusActionEntry,
  getChangedByUserId,
  getRequiredStatusActionNote,
  recordVoidTimeEntryStatusChange,
} from './time-entry-status-action-helpers';
import {
  voidTimeEntryWithPayrollTransaction,
} from './time-entry-status-payroll-transaction';
import {
  getVoidPayrollContext,
} from './time-entry-void-payroll';

export async function voidTimeEntryFlow({
  prisma,
  payrollService,
  realtimeGateway,
  auditLogsService,
  id,
  adminNote,
  user,
  selectedCinemaId,
  confirmPayrollAdjustment,
}: {
  prisma: PrismaService;
  payrollService: PayrollService;
  realtimeGateway: RealtimeGateway;
  auditLogsService: AuditLogsService;
  id: number;
  adminNote: string | undefined;
  user: any;
  selectedCinemaId?: number | null;
  confirmPayrollAdjustment: boolean;
}) {
  const changedByUserId =
    getChangedByUserId(user);
  const trimmedAdminNote =
    getRequiredStatusActionNote(
      adminNote,
      'Admin-begrundelse er påkrævet ved annullering af tidsregistrering',
    );
  const existingEntry =
    await findEditableStatusActionEntry({
      prisma,
      id,
      user,
      selectedCinemaId,
    });

  if (existingEntry.status === 'VOIDED') {
    throw new BadRequestException(
      'Tidsregistreringen er allerede annulleret',
    );
  }

  const payrollContext =
    await getVoidPayrollContext({
      prisma,
      payrollService,
      existingEntry,
      confirmPayrollAdjustment,
    });

  const entry =
    await voidTimeEntryWithPayrollTransaction({
      prisma,
      id,
      existingEntry,
      payrollContext,
      reason: trimmedAdminNote,
      changedByUserId:
        changedByUserId ?? null,
    });

  await recordVoidTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    changedByUserId,
    reason: trimmedAdminNote,
  });

  return notifyTimeEntryUpdated(
    realtimeGateway,
    entry,
  );
}
