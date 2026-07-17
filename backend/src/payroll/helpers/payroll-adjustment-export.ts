import { PrismaService } from '../../prisma/prisma.service';

type PayrollAdjustmentExportPrisma = Pick<
  PrismaService,
  'payrollAdjustment' | 'payrollAdjustmentRevision'
>;

export async function includePendingPayrollAdjustmentsInPeriod(
  prisma: PayrollAdjustmentExportPrisma,
  params: {
    cinemaId: number;
    payrollPeriodId: number;
    periodStart: Date;
    includedAt: Date;
    changedByUserId: number;
  },
) {
  const adjustments = await prisma.payrollAdjustment.findMany({
    where: {
      cinemaId: params.cinemaId,
      status: 'PENDING',
      OR: [
        {
          settlementPayrollPeriodId: params.payrollPeriodId,
        },
        {
          settlementPayrollPeriodId: null,
          originalPayrollPeriod: {
            endDate: {
              lt: params.periodStart,
            },
          },
        },
      ],
    },
  });

  for (const adjustment of adjustments) {
    const includedAdjustment =
      await prisma.payrollAdjustment.update({
        where: {
          id: adjustment.id,
        },
        data: {
          status: 'INCLUDED',
          settlementPayrollPeriodId: params.payrollPeriodId,
          includedAt: params.includedAt,
          voidedAt: null,
        },
      });

    await prisma.payrollAdjustmentRevision.create({
      data: {
        payrollAdjustmentId: adjustment.id,
        changedByUserId: params.changedByUserId,
        action: 'INCLUDED',
        previousStatus: adjustment.status,
        newStatus: includedAdjustment.status,
        previousExportedMinutes: adjustment.exportedMinutes,
        newExportedMinutes: includedAdjustment.exportedMinutes,
        previousAdjustedMinutes: adjustment.adjustedMinutes,
        newAdjustedMinutes: includedAdjustment.adjustedMinutes,
        previousMinutesDelta: adjustment.minutesDelta,
        newMinutesDelta: includedAdjustment.minutesDelta,
        previousOriginalPayrollPeriodId:
          adjustment.originalPayrollPeriodId,
        newOriginalPayrollPeriodId:
          includedAdjustment.originalPayrollPeriodId,
        previousSettlementPayrollPeriodId:
          adjustment.settlementPayrollPeriodId,
        newSettlementPayrollPeriodId:
          includedAdjustment.settlementPayrollPeriodId,
        reason: 'Medtaget i løneksport.',
      },
    });
  }

  return adjustments.length;
}
