import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { formatSignedDuration, getEntryMinutes } from './time-entry-deviation';
import { createOrUpdateTimeEntryPayrollAdjustment } from './time-entry-payroll-adjustments';

type ExportedPayrollAdjustmentContext = {
  prisma: PrismaService;
  payrollService: PayrollService;
  existingEntry: any;
  entry: any;
  reason: string;
  changedByUserId: number | null;
};

async function getOriginalPayrollPeriod({
  prisma,
  payrollService,
  existingEntry,
  useLinkedPayrollPeriod = false,
}: Pick<
  ExportedPayrollAdjustmentContext,
  'prisma' | 'payrollService' | 'existingEntry'
> & {
  useLinkedPayrollPeriod?: boolean;
}) {
  if (useLinkedPayrollPeriod && existingEntry.payrollPeriodId) {
    return prisma.payrollPeriod.findUnique({
      where: { id: existingEntry.payrollPeriodId },
    });
  }

  return payrollService.getPayrollPeriodEntityForDate(
    existingEntry.cinemaId,
    existingEntry.clockIn,
  );
}

export async function createEditAfterExportPayrollAdjustmentIfNeeded({
  prisma,
  payrollService,
  existingEntry,
  entry,
  reason,
  changedByUserId,
  useLinkedPayrollPeriod = false,
}: ExportedPayrollAdjustmentContext & {
  useLinkedPayrollPeriod?: boolean;
}) {
  const payrollPeriod = await getOriginalPayrollPeriod({
    prisma,
    payrollService,
    existingEntry,
    useLinkedPayrollPeriod,
  });

  if (payrollPeriod?.status !== 'EXPORTED') {
    return;
  }

  const adjustmentPayrollPeriod =
    await payrollService.getCurrentPayrollPeriodEntity(existingEntry.cinemaId);
  const exportedMinutes = getEntryMinutes(existingEntry);
  const adjustedMinutes = getEntryMinutes(entry);

  await createOrUpdateTimeEntryPayrollAdjustment(prisma, {
    timeEntry: entry,
    originalPayrollPeriodId: payrollPeriod.id,
    settlementPayrollPeriodId: adjustmentPayrollPeriod?.id ?? null,
    type: 'EDIT_AFTER_EXPORT',
    exportedMinutes,
    adjustedMinutes,
    reason: `Tidsregistrering rettet efter eksport. Tidligere registreret: ${formatSignedDuration(
      exportedMinutes,
    ).replace('+', '')}. Ny registrering: ${formatSignedDuration(
      adjustedMinutes,
    ).replace('+', '')}. Efterregulering: ${formatSignedDuration(
      adjustedMinutes - exportedMinutes,
    )}. Årsag: ${reason}`,
    changedByUserId,
  });
}

export async function createVoidAfterExportPayrollAdjustmentIfNeeded({
  prisma,
  payrollService,
  existingEntry,
  entry,
  reason,
  changedByUserId,
}: ExportedPayrollAdjustmentContext) {
  const payrollPeriod = await getOriginalPayrollPeriod({
    prisma,
    payrollService,
    existingEntry,
  });

  if (payrollPeriod?.status !== 'EXPORTED') {
    return;
  }

  const adjustmentPayrollPeriod =
    await payrollService.getCurrentPayrollPeriodEntity(existingEntry.cinemaId);
  const exportedMinutes = getEntryMinutes(existingEntry);

  await createOrUpdateTimeEntryPayrollAdjustment(prisma, {
    timeEntry: entry,
    originalPayrollPeriodId: payrollPeriod.id,
    settlementPayrollPeriodId: adjustmentPayrollPeriod?.id ?? null,
    type: 'EDIT_AFTER_EXPORT',
    exportedMinutes,
    adjustedMinutes: 0,
    reason: `Tidsregistrering annulleret efter eksport. Efterregulering: ${formatSignedDuration(
      -exportedMinutes,
    )}. Årsag: ${reason}`,
    changedByUserId,
  });
}
