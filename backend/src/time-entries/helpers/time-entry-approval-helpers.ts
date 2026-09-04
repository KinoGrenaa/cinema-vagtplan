import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { getPayrollReferenceDate } from '../../payroll/helpers/payroll-periods';
import { PayrollService } from '../../payroll/payroll.service';
import { analyzeTimeEntryDeviation } from './time-entry-deviation';
import { ensureApprovalDeviationNotes } from './time-entry-deviation-notes';

type ApprovalPayrollContext = {
  payrollPeriod: any;
  adjustmentPayrollPeriod: any;
  adjustmentPayrollPeriodId: number | null;
};

export async function getApprovalPayrollContext({
  payrollService,
  existingEntry,
  confirmPayrollAdjustment,
}: {
  payrollService: PayrollService;
  existingEntry: any;
  confirmPayrollAdjustment: boolean;
}): Promise<ApprovalPayrollContext> {
  const payrollPeriod =
    await payrollService.getPayrollPeriodEntityForDate(
      existingEntry.cinemaId,
      getPayrollReferenceDate(existingEntry),
    );

  if (payrollPeriod?.status === 'LOCKED') {
    throw new ConflictException({
      code: 'PAYROLL_PERIOD_LOCKED',
      title: 'Lønperioden er låst',
      message:
        'Lås lønperioden op før tidsregistreringen kan godkendes.',
    });
  }

  if (
    payrollPeriod?.status === 'EXPORTED' &&
    !confirmPayrollAdjustment
  ) {
    const adjustmentPayrollPeriod =
      await payrollService.getCurrentPayrollPeriodEntity(
        existingEntry.cinemaId,
      );

    throw new ConflictException({
      code: 'PAYROLL_PERIOD_EXPORTED',
      title: 'Lønperioden er allerede eksporteret',
      message:
        'Denne tidsregistrering tilhører en lønperiode, der allerede er eksporteret.',
      originalPayrollPeriod: {
        id: payrollPeriod.id,
        startDate: payrollPeriod.startDate,
        endDate: payrollPeriod.endDate,
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

  let adjustmentPayrollPeriodId: number | null = null;
  let adjustmentPayrollPeriod: any = null;

  if (
    payrollPeriod?.status === 'EXPORTED' &&
    confirmPayrollAdjustment
  ) {
    adjustmentPayrollPeriod =
      await payrollService.getCurrentPayrollPeriodEntity(
        existingEntry.cinemaId,
      );
    adjustmentPayrollPeriodId =
      adjustmentPayrollPeriod?.id ?? null;
  }

  return {
    payrollPeriod,
    adjustmentPayrollPeriod,
    adjustmentPayrollPeriodId,
  };
}

export function ensureTimeEntryCanBeApproved(
  existingEntry: any,
) {
  if (existingEntry.status === 'APPROVED') {
    throw new BadRequestException(
      'Tidsregistreringen er allerede godkendt',
    );
  }

  if (existingEntry.status === 'VOIDED') {
    throw new BadRequestException(
      'En annulleret tidsregistrering kan ikke godkendes',
    );
  }

  const deviation = analyzeTimeEntryDeviation(
    existingEntry,
    existingEntry.cinema,
  );

  if (deviation.types.includes('OPEN_ENTRY')) {
    throw new BadRequestException(
      'En åben tidsregistrering kan ikke godkendes',
    );
  }

  ensureApprovalDeviationNotes({
    deviation,
    clockInNote: existingEntry.clockInNote,
    clockOutNote: existingEntry.clockOutNote,
    note: existingEntry.note,
    adminNote: existingEntry.adminNote,
  });
}

export function getApprovalPayrollUpdateData({
  payrollPeriod,
  adjustmentPayrollPeriodId,
  confirmPayrollAdjustment,
}: ApprovalPayrollContext & {
  confirmPayrollAdjustment: boolean;
}) {
  const shouldCreateAdjustment =
    payrollPeriod?.status === 'EXPORTED' &&
    confirmPayrollAdjustment;

  return {
    status: 'APPROVED' as const,
    payrollPeriodId: shouldCreateAdjustment
      ? null
      : payrollPeriod?.id,
    isPayrollAdjustment: shouldCreateAdjustment,
    originalPayrollPeriodId: shouldCreateAdjustment
      ? payrollPeriod.id
      : null,
    adjustmentPayrollPeriodId,
    payrollAdjustmentReason: shouldCreateAdjustment
      ? 'Godkendt som efterregulering, fordi lønperioden allerede var eksporteret.'
      : null,
  };
}
