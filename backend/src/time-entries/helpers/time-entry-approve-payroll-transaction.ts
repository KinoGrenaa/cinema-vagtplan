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

export async function approveTimeEntryWithPayrollTransaction({
  prisma,
  id,
  approvalPayrollContext,
  confirmPayrollAdjustment,
  changedByUserId,
}: {
  prisma: PrismaService;
  id: number;
  approvalPayrollContext: {
    payrollPeriod: any;
    adjustmentPayrollPeriod: any;
    adjustmentPayrollPeriodId: number | null;
  };
  confirmPayrollAdjustment: boolean;
  changedByUserId: number | null;
}) {
  return prisma.$transaction(async (tx) => {
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
      const adjustedMinutes = getEntryMinutes(entry);

      await createOrUpdateTimeEntryPayrollAdjustment(
        tx as unknown as PrismaService,
        {
          timeEntry: entry,
          originalPayrollPeriodId:
            approvalPayrollContext.payrollPeriod.id,
          settlementPayrollPeriodId:
            approvalPayrollContext.adjustmentPayrollPeriod
              ?.id ?? null,
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
  });
}
