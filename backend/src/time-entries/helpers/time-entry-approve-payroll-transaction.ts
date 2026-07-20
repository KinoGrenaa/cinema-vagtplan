import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getApprovalPayrollUpdateData,
} from './time-entry-approval-helpers';
import {
  formatSignedDuration,
  getEntryMinutes,
} from './time-entry-deviation';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { createOrUpdateTimeEntryPayrollAdjustment } from './time-entry-payroll-adjustments';

async function approveTimeEntryWithPayrollClient({
  tx,
  id,
  approvalPayrollContext,
  confirmPayrollAdjustment,
  changedByUserId,
}: {
  tx: Prisma.TransactionClient;
  id: number;
  approvalPayrollContext: {
    payrollPeriod: any;
    adjustmentPayrollPeriod: any;
    adjustmentPayrollPeriodId: number | null;
  };
  confirmPayrollAdjustment: boolean;
  changedByUserId: number | null;
}) {
  const entry = await tx.timeEntry.update({
    where: {
      id,
    },
    data: getApprovalPayrollUpdateData({
      ...approvalPayrollContext,
      confirmPayrollAdjustment,
    }),
    include: getTimeEntryResponseInclude(),
  });

  if (
    approvalPayrollContext.payrollPeriod?.status ===
      'EXPORTED' &&
    confirmPayrollAdjustment
  ) {
    const adjustedMinutes =
      getEntryMinutes(entry);

    await createOrUpdateTimeEntryPayrollAdjustment(
      tx as unknown as PrismaService,
      {
        timeEntry: entry,
        originalPayrollPeriodId:
          approvalPayrollContext.payrollPeriod.id,
        settlementPayrollPeriodId:
          approvalPayrollContext
            .adjustmentPayrollPeriod?.id ?? null,
        type: 'APPROVAL_AFTER_EXPORT',
        exportedMinutes: 0,
        adjustedMinutes,
        reason:
          'Tidsregistrering godkendt efter eksport.\n' +
          `Efterregulering: ${formatSignedDuration(
            adjustedMinutes,
          )}`,
        changedByUserId,
      },
    );
  }

  return entry;
}

export async function approveTimeEntryWithPayrollTransaction({
  prisma,
  transactionClient,
  id,
  approvalPayrollContext,
  confirmPayrollAdjustment,
  changedByUserId,
}: {
  prisma: PrismaService;
  transactionClient?: Prisma.TransactionClient;
  id: number;
  approvalPayrollContext: {
    payrollPeriod: any;
    adjustmentPayrollPeriod: any;
    adjustmentPayrollPeriodId: number | null;
  };
  confirmPayrollAdjustment: boolean;
  changedByUserId: number | null;
}) {
  const execute = (
    tx: Prisma.TransactionClient,
  ) =>
    approveTimeEntryWithPayrollClient({
      tx,
      id,
      approvalPayrollContext,
      confirmPayrollAdjustment,
      changedByUserId,
    });

  if (transactionClient) {
    return execute(transactionClient);
  }

  return prisma.$transaction(execute);
}
