import { PrismaService } from '../../prisma/prisma.service';

type PayrollAdjustmentReopeningPrisma = Pick<
  PrismaService,
  'payrollAdjustment' | 'payrollAdjustmentRevision'
>;

export async function reopenIncludedPayrollAdjustmentsForPeriod(
  prisma: PayrollAdjustmentReopeningPrisma,
  params: {
    cinemaId: number;
    payrollPeriodId: number;
    changedByUserId: number;
    note: string;
  },
) {
  const includedAdjustments =
    await prisma.payrollAdjustment.findMany({
      where: {
        cinemaId: params.cinemaId,
        settlementPayrollPeriodId: params.payrollPeriodId,
        status: 'INCLUDED',
      },
    });

  for (const adjustment of includedAdjustments) {
    const reopenedAdjustment =
      await prisma.payrollAdjustment.update({
        where: {
          id: adjustment.id,
        },
        data: {
          status: 'PENDING',
          includedAt: null,
          voidedAt: null,
        },
      });

    await prisma.payrollAdjustmentRevision.create({
      data: {
        payrollAdjustmentId: adjustment.id,
        changedByUserId: params.changedByUserId,
        action: 'UPDATED',
        previousStatus: adjustment.status,
        newStatus: reopenedAdjustment.status,
        previousExportedMinutes:
          adjustment.exportedMinutes,
        newExportedMinutes:
          reopenedAdjustment.exportedMinutes,
        previousAdjustedMinutes:
          adjustment.adjustedMinutes,
        newAdjustedMinutes:
          reopenedAdjustment.adjustedMinutes,
        previousMinutesDelta: adjustment.minutesDelta,
        newMinutesDelta: reopenedAdjustment.minutesDelta,
        previousOriginalPayrollPeriodId:
          adjustment.originalPayrollPeriodId,
        newOriginalPayrollPeriodId:
          reopenedAdjustment.originalPayrollPeriodId,
        previousSettlementPayrollPeriodId:
          adjustment.settlementPayrollPeriodId,
        newSettlementPayrollPeriodId:
          reopenedAdjustment.settlementPayrollPeriodId,
        reason:
          `Lønperioden blev genåbnet. ${params.note}`,
      },
    });
  }

  return includedAdjustments.length;
}
