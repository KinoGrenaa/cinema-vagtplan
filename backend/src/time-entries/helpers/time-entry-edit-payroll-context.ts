import { PayrollService } from '../../payroll/payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getEntryMinutes } from './time-entry-deviation';

export type TimeEntryEditPayrollContext = {
  originalPayrollPeriod: any;
  adjustmentPayrollPeriod: any | null;
  exportedMinutes: number;
};

type RelevantPayrollAdjustment = {
  status: 'PENDING' | 'INCLUDED';
  originalPayrollPeriodId: number;
  settlementPayrollPeriodId: number | null;
  exportedMinutes: number;
  adjustedMinutes: number;
};

async function findRelevantPayrollAdjustment(
  prisma: PrismaService,
  timeEntryId: number,
) {
  return prisma.payrollAdjustment.findFirst({
    where: {
      timeEntryId,
      status: {
        in: ['PENDING', 'INCLUDED'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      status: true,
      originalPayrollPeriodId: true,
      settlementPayrollPeriodId: true,
      exportedMinutes: true,
      adjustedMinutes: true,
    },
  }) as Promise<RelevantPayrollAdjustment | null>;
}

function resolveExportReference(
  existingEntry: any,
  adjustment: RelevantPayrollAdjustment | null,
) {
  if (adjustment?.status === 'PENDING') {
    return {
      payrollPeriodId: adjustment.originalPayrollPeriodId,
      exportedMinutes: adjustment.exportedMinutes,
    };
  }

  if (adjustment?.status === 'INCLUDED') {
    return {
      payrollPeriodId:
        adjustment.settlementPayrollPeriodId ??
        adjustment.originalPayrollPeriodId,
      exportedMinutes: adjustment.adjustedMinutes,
    };
  }

  if (existingEntry.payrollPeriodId) {
    return {
      payrollPeriodId: existingEntry.payrollPeriodId,
      exportedMinutes: getEntryMinutes(existingEntry),
    };
  }

  if (
    existingEntry.isPayrollAdjustment &&
    existingEntry.originalPayrollPeriodId
  ) {
    return {
      payrollPeriodId: existingEntry.originalPayrollPeriodId,
      exportedMinutes: 0,
    };
  }

  return null;
}

export async function getTimeEntryEditPayrollContext({
  prisma,
  payrollService,
  existingEntry,
}: {
  prisma: PrismaService;
  payrollService: PayrollService;
  existingEntry: any;
}): Promise<TimeEntryEditPayrollContext | null> {
  const relevantAdjustment = await findRelevantPayrollAdjustment(
    prisma,
    existingEntry.id,
  );
  const exportReference = resolveExportReference(
    existingEntry,
    relevantAdjustment,
  );

  if (!exportReference) {
    return null;
  }

  const originalPayrollPeriod =
    await prisma.payrollPeriod.findUnique({
      where: {
        id: exportReference.payrollPeriodId,
      },
    });

  if (originalPayrollPeriod?.status !== 'EXPORTED') {
    return null;
  }

  const adjustmentPayrollPeriod =
    await payrollService.getCurrentPayrollPeriodEntity(
      existingEntry.cinemaId,
    );

  return {
    originalPayrollPeriod,
    adjustmentPayrollPeriod,
    exportedMinutes: exportReference.exportedMinutes,
  };
}
