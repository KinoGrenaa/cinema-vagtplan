import { BadRequestException } from '@nestjs/common';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { createVoidAfterExportPayrollAdjustmentIfNeeded } from './time-entry-exported-payroll-adjustments';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { notifyTimeEntryUpdated } from './time-entry-response';
import {
  findEditableStatusActionEntry,
  getChangedByUserId,
  getRequiredStatusActionNote,
  recordVoidTimeEntryStatusChange,
} from './time-entry-status-action-helpers';

export async function voidTimeEntryFlow({
  prisma,
  payrollService,
  realtimeGateway,
  auditLogsService,
  id,
  adminNote,
  user,
  selectedCinemaId,
}: {
  prisma: PrismaService;
  payrollService: PayrollService;
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
    'Admin-begrundelse er påkrævet ved annullering af tidsregistrering',
  );

  const existingEntry = await findEditableStatusActionEntry({
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

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      status: 'VOIDED',
      adminNote: trimmedAdminNote,
    },
    include: getTimeEntryResponseInclude(),
  });

  await createVoidAfterExportPayrollAdjustmentIfNeeded({
    prisma,
    payrollService,
    existingEntry,
    entry,
    reason: trimmedAdminNote,
    changedByUserId: changedByUserId ?? null,
  });

  await recordVoidTimeEntryStatusChange({
    prisma,
    auditLogsService,
    existingEntry,
    entry,
    changedByUserId,
    reason: trimmedAdminNote,
  });

  return notifyTimeEntryUpdated(realtimeGateway, entry);
}
