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
import { withLockedTimeEntryStatusMutation } from './time-entry-status-mutation-lock';
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
        if (
          existingEntry.status === 'VOIDED'
        ) {
          throw new BadRequestException(
            'Tidsregistreringen er allerede annulleret',
          );
        }

        const payrollContext =
          await getVoidPayrollContext({
            prisma:
              tx as unknown as PrismaService,
            payrollService,
            existingEntry,
            confirmPayrollAdjustment,
          });

        const entry =
          await voidTimeEntryWithPayrollTransaction({
            prisma,
            transactionClient: tx,
            id,
            existingEntry,
            payrollContext,
            reason: trimmedAdminNote,
            changedByUserId:
              changedByUserId ?? null,
          });

        return {
          existingEntry,
          entry,
        };
      },
    });

  await recordVoidTimeEntryStatusChange({
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
