import { ConflictException } from '@nestjs/common';
import { getPayrollReferenceDate } from '../../payroll/helpers/payroll-periods';
import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  formatSignedDuration,
  getEntryMinutes,
} from './time-entry-deviation';
import { createOrUpdateTimeEntryPayrollAdjustment } from './time-entry-payroll-adjustments';

export type VoidPayrollContext = {
  originalPayrollPeriod: any | null;
  adjustmentPayrollPeriod: any | null;
  requiresPayrollAdjustment: boolean;
};

async function findLinkedOrCalculatedPayrollPeriod({
  prisma,
  payrollService,
  existingEntry,
}: {
  prisma: PrismaService;
  payrollService: PayrollService;
  existingEntry: any;
}) {
  const linkedPayrollPeriodId =
    existingEntry.payrollPeriodId ??
    existingEntry.originalPayrollPeriodId ??
    null;

  if (linkedPayrollPeriodId) {
    return prisma.payrollPeriod.findUnique({
      where: {
        id: linkedPayrollPeriodId,
      },
    });
  }

  return payrollService.getPayrollPeriodEntityForDate(
    existingEntry.cinemaId,
    getPayrollReferenceDate(existingEntry),
  );
}

export async function getVoidPayrollContext({
  prisma,
  payrollService,
  existingEntry,
  confirmPayrollAdjustment,
}: {
  prisma: PrismaService;
  payrollService: PayrollService;
  existingEntry: any;
  confirmPayrollAdjustment: boolean;
}): Promise<VoidPayrollContext> {
  if (existingEntry.status !== 'APPROVED') {
    return {
      originalPayrollPeriod: null,
      adjustmentPayrollPeriod: null,
      requiresPayrollAdjustment: false,
    };
  }

  const originalPayrollPeriod =
    await findLinkedOrCalculatedPayrollPeriod({
      prisma,
      payrollService,
      existingEntry,
    });

  if (originalPayrollPeriod?.status !== 'EXPORTED') {
    return {
      originalPayrollPeriod,
      adjustmentPayrollPeriod: null,
      requiresPayrollAdjustment: false,
    };
  }

  const adjustmentPayrollPeriod =
    await payrollService.getCurrentPayrollPeriodEntity(
      existingEntry.cinemaId,
    );

  if (!confirmPayrollAdjustment) {
    throw new ConflictException({
      code: 'PAYROLL_PERIOD_EXPORTED',
      title: 'Lønperioden er allerede eksporteret',
      message:
        'Denne godkendte tidsregistrering er allerede med i en eksporteret lønperiode.',
      originalPayrollPeriod: {
        id: originalPayrollPeriod.id,
        startDate: originalPayrollPeriod.startDate,
        endDate: originalPayrollPeriod.endDate,
      },
      adjustmentPayrollPeriod: adjustmentPayrollPeriod
        ? {
            id: adjustmentPayrollPeriod.id,
            startDate: adjustmentPayrollPeriod.startDate,
            endDate: adjustmentPayrollPeriod.endDate,
          }
        : null,
    });
  }

  return {
    originalPayrollPeriod,
    adjustmentPayrollPeriod,
    requiresPayrollAdjustment: true,
  };
}

export async function createVoidPayrollAdjustmentIfNeeded({
  prisma,
  existingEntry,
  entry,
  payrollContext,
  reason,
  changedByUserId,
}: {
  prisma: PrismaService;
  existingEntry: any;
  entry: any;
  payrollContext: VoidPayrollContext;
  reason: string;
  changedByUserId: number | null;
}) {
  if (
    !payrollContext.requiresPayrollAdjustment ||
    !payrollContext.originalPayrollPeriod
  ) {
    return null;
  }

  const exportedMinutes = existingEntry.isPayrollAdjustment
    ? 0
    : getEntryMinutes(existingEntry);

  return createOrUpdateTimeEntryPayrollAdjustment(prisma, {
    timeEntry: entry,
    originalPayrollPeriodId:
      payrollContext.originalPayrollPeriod.id,
    settlementPayrollPeriodId:
      payrollContext.adjustmentPayrollPeriod?.id ?? null,
    type: 'EDIT_AFTER_EXPORT',
    exportedMinutes,
    adjustedMinutes: 0,
    reason:
      'Tidsregistrering annulleret efter eksport.\n' +
      `Efterregulering: ${formatSignedDuration(
        -exportedMinutes,
      )}. ` +
      `Årsag: ${reason}`,
    changedByUserId,
  });
}
